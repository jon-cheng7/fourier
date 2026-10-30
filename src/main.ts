// Entry point. Wires stage, loop, views, input and controls.

import './style.css';
import { createStage } from './stage';
import { createLoop } from './loop';
import { createCamera } from './camera';
import {
    createPanel,
    addSlider,
    addChoice,
    addToggle,
    addTextBox,
    addButton,
} from './controls';
import { createTooltip } from './ui/tooltip';
import { createEquation, describeTerm, type SeriesKind } from './ui/equation';
import { squareWave } from './math/series';
import { chain, tracePath, splitTerms } from './math/epicycles';
import { dft, byAmplitude } from './math/dft';
import { heart } from './math/shapes';
import { resample, normalize } from './math/path';
import type { Point, Term } from './math/types';
import { drawEpicycles } from './views/epicycles';
import { fromScreen, toScreen, type Viewport } from './views/viewport';
import { drawWave, type Graph } from './views/wave';
import { createTrace, type Trace } from './views/trace';
import { drawCrosshair } from './views/crosshair';
import { pickCircle } from './views/pick';
import { createFreehand } from './input/freehand';
import { pathData, samplePath } from './input/svg';

type Mode = 'square' | 'heart' | 'draw' | 'svg';
type ShapeMode = Exclude<Mode, 'square'>;
type Layout = 'radial' | 'split';
type Tool = 'pen' | 'hand';

const TAU = Math.PI * 2;
const SQUARE_MAX = 50;
const SHAPE_POINTS = 1024;
const MIN_TRACE_SAMPLES = 600;
// Zoom stops when the smallest circle that matters is this big (radius, px)
const ZOOM_TARGET_PX = 20;
const ZOOM_MIN_LIMIT = 4;
const ZOOM_MAX_LIMIT = 200;
const EXAMPLE_SVG =
    'M 20 50 C 40 20 75 20 90 50 C 75 80 40 80 20 50 L 5 35 L 8 50 L 5 65 Z';

const TIPS = {
    square: 'Built from known coefficients: odd harmonics n, each 4/(πn) tall. No DFT needed.',
    heart: 'A heart curve sampled at 1024 points, then turned into circles by the DFT.',
    draw: 'Draw any closed shape. It’s resampled to evenly spaced points, centred, scaled, then run through the DFT.',
    svg: 'Paste an SVG path. The browser walks along it to give evenly spaced points for the DFT.',
    radial: 'All circles chained tip to tail; the last tip draws the shape.',
    split: 'Each circle becomes two mirrored half-size circles spinning opposite ways. One chain then only moves sideways (x), the other only up and down (y). Where their guide lines cross is the pen.',
    terms: 'How many circles are used, biggest first. Each one is a single Fourier coefficient. Smooth shapes need few; sharp corners need many.',
    speed: 'One cycle (t from 0 to 2π) draws the whole shape once. 1× is a cycle every 8 s.',
    trail: 'How much of the last cycle stays drawn behind the pen.',
    sort: 'Chain the circles biggest first. The drawing is identical either way, because adding arms in any order lands on the same tip; only the arm’s motion changes.',
    circles: 'Show the circles, or just the arm joining their centres.',
    play: 'Pause or play the cycle (Space).',
    reset: 'Back to the normal view. Double-click the drawing does the same.',
    pen: 'Drag to draw a new closed shape; it replaces the current one (D).',
    hand: 'Drag to pan without drawing (H). Right- or middle-drag always pans.',
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const stage = createStage(app);
const { ctx } = stage;

function svgTerms(source: string): Term[] {
    const points = samplePath(pathData(source), SHAPE_POINTS);
    return byAmplitude(dft(normalize(points)));
}

// Biggest first, so slicing keeps the best approximation
const shapeTerms: Record<ShapeMode, Term[]> = {
    heart: byAmplitude(dft(heart(SHAPE_POINTS))),
    draw: [],
    svg: svgTerms(EXAMPLE_SVG),
};

let mode: Mode = 'square';
const counts: Record<Mode, number> = {
    square: 5,
    heart: SHAPE_POINTS,
    draw: SHAPE_POINTS,
    svg: SHAPE_POINTS,
};
let sorted = true;
let layout: Layout = 'radial';
let tool: Tool = 'pen';
let terms: Term[] = [];
let trace: Trace | null = null;
let split: { x: Term[]; y: Term[] } | null = null;
let smallestAmp = 0;
let t = 0;
let speedLevel = 4; // ×0.25 per step; 4 = one cycle every 8 s
let trailPercent = 100;
let showCircles = true;

// Hover: a chip in the equation bar wins over the canvas pointer
let chipHover = -1;
let cursor: Point | null = null;
let canvasTip = false;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !reducedMotion.matches;

const seriesKind = (): SeriesKind => (mode === 'square' ? 'wave' : 'shape');

function updateTerms() {
    trace = null;
    split = null;
    if (mode === 'square') {
        terms = squareWave(counts.square);
    } else {
        const picked = shapeTerms[mode].slice(0, counts[mode]);
        terms = sorted ? picked : [...picked].sort((a, b) => a.freq - b.freq);
    }
    smallestAmp = smallestVisibleAmp(terms);
    equation.set(terms.length ? seriesKind() : null, terms, sorted);
}

// Circles under 0.01% of the biggest are noise, not detail worth zooming to
function smallestVisibleAmp(ts: Term[]): number {
    let largest = 0;
    for (const { amp } of ts) largest = Math.max(largest, amp);
    let smallest = largest;
    for (const { amp } of ts) {
        if (amp > largest * 1e-4) smallest = Math.min(smallest, amp);
    }
    return smallest;
}

// More terms → smaller circles → more worth zooming into
function zoomLimit(baseScale: number): number {
    if (smallestAmp === 0) return 1;
    const zoom = ZOOM_TARGET_PX / (smallestAmp * baseScale);
    return Math.min(ZOOM_MAX_LIMIT, Math.max(ZOOM_MIN_LIMIT, zoom));
}

// 4× the highest freq keeps fast circles smooth, not just un-aliased
function traceSamples(): number {
    let maxFreq = 0;
    for (const { freq } of terms) maxFreq = Math.max(maxFreq, Math.abs(freq));
    return Math.max(MIN_TRACE_SAMPLES, 4 * maxFreq);
}

function shapeView(): Viewport {
    const { width, height } = stage;
    return {
        origin: { x: width / 2, y: height / 2 },
        scale: Math.min(width, height) * 0.35,
    };
}

// Shape bottom-right, x chain above it, y chain left of it. Sharing an
// origin x (or y) is what lines each chain's tip up with the pen
function splitViews(): { shape: Viewport; x: Viewport; y: Viewport } {
    const { width, height } = stage;
    const scale = Math.min(width, height) / 5.2;
    const gap = 2.6 * scale;
    const cx = width / 2 + 1.35 * scale;
    const cy = height / 2 + 1.2 * scale;
    return {
        shape: { origin: { x: cx, y: cy }, scale },
        x: { origin: { x: cx, y: cy - gap }, scale },
        y: { origin: { x: cx - gap, y: cy }, scale },
    };
}

// normalize() sets size and position, so the stroke only needs its y flipped
const FLIP: Viewport = { origin: { x: 0, y: 0 }, scale: 1 };

const freehand = createFreehand(stage.canvas, (stroke) => {
    const points = stroke.map((p) => fromScreen(p, FLIP));
    shapeTerms.draw = byAmplitude(
        dft(normalize(resample(points, SHAPE_POINTS))),
    );
    t = 0;
    camera.reset();
    setTool('hand');
    updateTerms();
});

// Left-drag pans unless the pen is armed in Draw mode
const camera = createCamera(stage.canvas, () => !freehand.enabled);

const tooltip = createTooltip(app);
const equation = createEquation(app, (i) => {
    chipHover = i;
});

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Drag to draw a closed shape';
app.append(hint);

// Draw mode only: arm the pen to draw, otherwise drags pan
const toolbar = document.createElement('div');
toolbar.className = 'toolbar';
app.append(toolbar);
const toolChoice = addChoice<Tool>(toolbar, {
    options: [
        { value: 'pen', label: '✎ Draw', tip: TIPS.pen },
        { value: 'hand', label: '✋ Pan', tip: TIPS.hand },
    ],
    value: tool,
    onChange: (next) => setTool(next),
});

const setTool = (next: Tool) => {
    tool = next;
    toolChoice.set(next);
    freehand.enabled = mode === 'draw' && tool === 'pen';
    app.classList.toggle('drawing', freehand.enabled);
};

const setMode = (m: Mode) => {
    mode = m;
    toolbar.hidden = mode !== 'draw';
    setTool(shapeTerms.draw.length ? 'hand' : 'pen');
    svgBox.row.hidden = mode !== 'svg';
    layoutChoice.row.hidden = mode === 'square';
    slider.set(counts[mode], mode === 'square' ? SQUARE_MAX : SHAPE_POINTS);
    camera.reset();
    updateTerms();
};

const panel = createPanel(app, matchMedia('(max-height: 560px)').matches);

addChoice<Mode>(panel, {
    options: [
        { value: 'square', label: 'Square wave', tip: TIPS.square },
        { value: 'heart', label: 'Heart', tip: TIPS.heart },
        { value: 'draw', label: 'Draw', tip: TIPS.draw },
        { value: 'svg', label: 'SVG', tip: TIPS.svg },
    ],
    value: mode,
    onChange: setMode,
});

const layoutChoice = addChoice<Layout>(panel, {
    options: [
        { value: 'radial', label: 'Radial', tip: TIPS.radial },
        { value: 'split', label: 'Split x / y', tip: TIPS.split },
    ],
    value: layout,
    onChange: (l) => {
        layout = l;
    },
});

const svgBox = addTextBox(panel, {
    value: EXAMPLE_SVG,
    placeholder: 'Paste an SVG file or path data',
    button: 'Use path',
    onSubmit: (text) => {
        try {
            shapeTerms.svg = svgTerms(text);
            svgBox.setError('');
            t = 0;
            camera.reset();
            updateTerms();
        } catch (e) {
            svgBox.setError(e instanceof Error ? e.message : 'Invalid SVG');
        }
    },
});

const slider = addSlider(panel, {
    label: 'Terms',
    tip: TIPS.terms,
    min: 1,
    max: SQUARE_MAX,
    value: counts.square,
    onInput: (n) => {
        counts[mode] = n;
        updateTerms();
    },
});

addSlider(panel, {
    label: 'Speed',
    tip: TIPS.speed,
    min: 1,
    max: 12,
    value: speedLevel,
    format: (v) => `${v / 4}×`,
    onInput: (v) => {
        speedLevel = v;
    },
});

addSlider(panel, {
    label: 'Trail',
    tip: TIPS.trail,
    min: 5,
    max: 100,
    value: trailPercent,
    format: (v) => `${v}%`,
    onInput: (v) => {
        trailPercent = v;
    },
});

const actions = document.createElement('div');
actions.className = 'row';
panel.append(actions);

const playButton = addButton(
    actions,
    '',
    () => setPlaying(!playing),
    TIPS.play,
);

function setPlaying(p: boolean) {
    playing = p;
    playButton.setLabel(playing ? 'Pause' : 'Play');
}

addToggle(actions, {
    label: 'Sort by size',
    tip: TIPS.sort,
    value: sorted,
    onChange: (s) => {
        sorted = s;
        updateTerms();
    },
});

addToggle(actions, {
    label: 'Circles',
    tip: TIPS.circles,
    value: showCircles,
    onChange: (s) => {
        showCircles = s;
    },
});

const viewRow = document.createElement('div');
viewRow.className = 'row';
panel.append(viewRow);
addButton(viewRow, 'Reset view', () => camera.reset(), TIPS.reset);
const viewHint = document.createElement('span');
viewHint.className = 'muted';
viewHint.textContent = 'Drag to pan · scroll to zoom · hover a circle';
viewRow.append(viewHint);

setMode(mode);
setPlaying(playing);

reducedMotion.addEventListener('change', () =>
    setPlaying(!reducedMotion.matches),
);

// Space toggles play; D / H pick the Draw-mode tool. Ignored while typing or on a focused control
window.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target instanceof Element && target.closest('input, textarea, button'))
        return;
    if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!playing);
    } else if (mode === 'draw' && e.code === 'KeyD') {
        setTool('pen');
    } else if (mode === 'draw' && e.code === 'KeyH') {
        setTool('hand');
    }
});

const canvasPoint = (e: PointerEvent): Point => {
    const rect = stage.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};
stage.canvas.addEventListener('pointermove', (e) => {
    cursor = e.buttons ? null : canvasPoint(e);
});
stage.canvas.addEventListener('pointerdown', () => {
    cursor = null;
});
stage.canvas.addEventListener('pointerleave', () => {
    cursor = null;
});

interface HoverChain {
    screen: Point[];
    // Circle index in this chain → term index
    termOf: (i: number) => number;
    // Term index → circle indices in this chain
    circlesOf: (term: number) => number[];
}

const SPLIT_NOTE =
    '<br>Here it’s drawn as two half-size circles spinning opposite ways: in the top chain they cancel up-down motion, in the side chain left-right.';

// Which term is hovered (chip first, then the circle under the cursor), shown as a tooltip
// on the canvas. Returns the circles to highlight in each chain
function hover(chains: HoverChain[], note = ''): number[][] {
    let term = chipHover;
    if (term < 0 && cursor) {
        for (const c of chains) {
            const i = pickCircle(c.screen, cursor);
            if (i >= 0) {
                term = c.termOf(i);
                break;
            }
        }
    }

    const fromCanvas = chipHover < 0 && term >= 0 && cursor !== null;
    if (fromCanvas && cursor) {
        tooltip.show(
            describeTerm(seriesKind(), terms[term], term, terms.length, note),
            cursor,
        );
        canvasTip = true;
    } else if (canvasTip) {
        tooltip.hide();
        canvasTip = false;
    }

    return chains.map((c) => (term >= 0 ? c.circlesOf(term) : []));
}

const toScreenAll = (points: Point[], view: Viewport) =>
    points.map((p) => toScreen(p, view));
const direct = { termOf: (i: number) => i, circlesOf: (k: number) => [k] };
const paired = {
    termOf: (i: number) => Math.floor(i / 2),
    circlesOf: (k: number) => [2 * k, 2 * k + 1],
};

function drawStroke(stroke: Point[]) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const p of stroke) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Closing segment the DFT will add
    const first = stroke[0];
    const last = stroke[stroke.length - 1];
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(first.x, first.y);
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw() {
    const { width, height } = stage;
    ctx.clearRect(0, 0, width, height);

    const drawing = freehand.stroke.length > 0;
    hint.hidden = !(mode === 'draw' && !drawing && terms.length === 0);

    if (mode === 'square') {
        const base: Viewport = {
            origin: { x: width * 0.25, y: height / 2 },
            scale: Math.min(width * 0.12, height * 0.28),
        };
        camera.setMaxZoom(zoomLimit(base.scale));
        const view = camera.apply(base);
        const graph: Graph = {
            left: camera.x(width * 0.5),
            width: width * 0.45 * camera.zoom,
        };
        const points = chain(terms, t);
        const [lit] = hover([{ screen: toScreenAll(points, view), ...direct }]);
        drawWave(ctx, terms, t, view, graph);
        drawEpicycles(ctx, points, view, showCircles, lit);
        return;
    }

    if (drawing) {
        hover([]);
        drawStroke(freehand.stroke);
        return;
    }
    if (terms.length === 0) {
        hover([]);
        return;
    }

    // Lazily, so a slider drag recomputes at most once per frame
    trace ??= createTrace(terms, tracePath(terms, traceSamples()));
    const head = t / TAU;
    const trail = trailPercent / 100;

    if (layout === 'radial') {
        const base = shapeView();
        camera.setMaxZoom(zoomLimit(base.scale));
        const view = camera.apply(base);
        const points = chain(terms, t);
        const [lit] = hover([{ screen: toScreenAll(points, view), ...direct }]);
        trace.draw(ctx, view, head, trail);
        drawEpicycles(ctx, points, view, showCircles, lit);
        return;
    }

    split ??= splitTerms(terms);
    const base = splitViews();
    camera.setMaxZoom(zoomLimit(base.shape.scale));
    const views = {
        shape: camera.apply(base.shape),
        x: camera.apply(base.x),
        y: camera.apply(base.y),
    };
    const xChain = chain(split.x, t);
    const yChain = chain(split.y, t);
    const [litX, litY] = hover(
        [
            { screen: toScreenAll(xChain, views.x), ...paired },
            { screen: toScreenAll(yChain, views.y), ...paired },
        ],
        SPLIT_NOTE,
    );

    trace.draw(ctx, views.shape, head, trail);
    drawEpicycles(ctx, xChain, views.x, showCircles, litX);
    drawEpicycles(ctx, yChain, views.y, showCircles, litY);
    drawCrosshair(
        ctx,
        toScreen(xChain[xChain.length - 1], views.x),
        toScreen(yChain[yChain.length - 1], views.y),
    );
}

const loop = createLoop((dt) => {
    if (playing) t = (t + (speedLevel / 4) * (TAU / 8) * dt) % TAU;
    draw();
});
loop.start();

// Embedded on the site: no work while scrolled out of view
new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loop.start();
    else loop.stop();
}).observe(app);
