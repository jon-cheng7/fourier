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
import { createFreehand } from './input/freehand';
import { pathData, samplePath } from './input/svg';

type Mode = 'square' | 'heart' | 'draw' | 'svg';
type ShapeMode = Exclude<Mode, 'square'>;
type Layout = 'radial' | 'split';

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
let terms: Term[] = [];
let trace: Trace | null = null;
let split: { x: Term[]; y: Term[] } | null = null;
let smallestAmp = 0;
let t = 0;
let speedLevel = 4; // ×0.25 per step; 4 = one cycle every 8 s
let trailPercent = 100;
let showCircles = true;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !reducedMotion.matches;

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

const freehand = createFreehand(stage.canvas, (stroke) => {
    const view = shapeView();
    const points = stroke.map((p) => fromScreen(p, view));
    shapeTerms.draw = byAmplitude(
        dft(normalize(resample(points, SHAPE_POINTS))),
    );
    t = 0;
    camera.reset();
    updateTerms();
});

// Left-drag pans everywhere except Draw mode, where it draws
const camera = createCamera(stage.canvas, () => !freehand.enabled);

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Draw a closed shape';
app.append(hint);

const setMode = (m: Mode) => {
    mode = m;
    freehand.enabled = mode === 'draw';
    app.classList.toggle('drawing', freehand.enabled);
    svgBox.row.hidden = mode !== 'svg';
    layoutRow.hidden = mode === 'square';
    slider.set(counts[mode], mode === 'square' ? SQUARE_MAX : SHAPE_POINTS);
    camera.reset();
    updateTerms();
};

const panel = createPanel(app, matchMedia('(max-height: 560px)').matches);

addChoice<Mode>(panel, {
    options: [
        { value: 'square', label: 'Square wave' },
        { value: 'heart', label: 'Heart' },
        { value: 'draw', label: 'Draw' },
        { value: 'svg', label: 'SVG' },
    ],
    value: mode,
    onChange: setMode,
});

const layoutRow = addChoice<Layout>(panel, {
    options: [
        { value: 'radial', label: 'Radial' },
        { value: 'split', label: 'Split x / y' },
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

const playButton = addButton(actions, '', () => setPlaying(!playing));

function setPlaying(p: boolean) {
    playing = p;
    playButton.setLabel(playing ? 'Pause' : 'Play');
}

addToggle(actions, {
    label: 'Sort by size',
    value: sorted,
    onChange: (s) => {
        sorted = s;
        updateTerms();
    },
});

addToggle(actions, {
    label: 'Circles',
    value: showCircles,
    onChange: (s) => {
        showCircles = s;
    },
});

const viewRow = document.createElement('div');
viewRow.className = 'row';
panel.append(viewRow);
addButton(viewRow, 'Reset view', () => camera.reset());
const viewHint = document.createElement('span');
viewHint.className = 'muted';
viewHint.textContent = 'Drag to pan · scroll to zoom';
viewRow.append(viewHint);

setMode(mode);
setPlaying(playing);

reducedMotion.addEventListener('change', () =>
    setPlaying(!reducedMotion.matches),
);

// Space toggles play, unless a control has focus and wants the key itself
window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const target = e.target;
    if (target instanceof Element && target.closest('input, textarea, button'))
        return;
    e.preventDefault();
    setPlaying(!playing);
});

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
        drawWave(ctx, terms, t, view, graph);
        drawEpicycles(ctx, chain(terms, t), view, showCircles);
        return;
    }

    if (drawing) {
        drawStroke(freehand.stroke);
        return;
    }
    if (terms.length === 0) return;

    // Lazily, so a slider drag recomputes at most once per frame
    trace ??= createTrace(terms, tracePath(terms, traceSamples()));
    const head = t / TAU;
    const trail = trailPercent / 100;

    if (layout === 'radial') {
        const base = shapeView();
        camera.setMaxZoom(zoomLimit(base.scale));
        const view = camera.apply(base);
        trace.draw(ctx, view, head, trail);
        drawEpicycles(ctx, chain(terms, t), view, showCircles);
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

    trace.draw(ctx, views.shape, head, trail);
    drawEpicycles(ctx, xChain, views.x, showCircles);
    drawEpicycles(ctx, yChain, views.y, showCircles);
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
