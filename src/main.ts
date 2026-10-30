// Entry point. Wires stage, loop, views, input and controls.

import './style.css';
import { createStage } from './stage';
import { createLoop } from './loop';
import {
    createPanel,
    addSlider,
    addChoice,
    addToggle,
    addTextBox,
} from './controls';
import { squareWave } from './math/series';
import { chain, tracePath } from './math/epicycles';
import { dft, byAmplitude } from './math/dft';
import { heart } from './math/shapes';
import { resample, normalize } from './math/path';
import type { Point, Term } from './math/types';
import { drawEpicycles } from './views/epicycles';
import { fromScreen, type Viewport } from './views/viewport';
import { drawWave, type Graph } from './views/wave';
import { drawTrace } from './views/trace';
import { createFreehand } from './input/freehand';
import { pathData, samplePath } from './input/svg';

type Mode = 'square' | 'heart' | 'draw' | 'svg';
type ShapeMode = Exclude<Mode, 'square'>;

const TAU = Math.PI * 2;
const SQUARE_MAX = 50;
const SHAPE_POINTS = 1024;
const MIN_TRACE_SAMPLES = 600;
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
let terms: Term[] = [];
let trace: Point[] | null = null;
let t = 0;
const speed = TAU / 8; // rad/s

function updateTerms() {
    trace = null;
    if (mode === 'square') {
        terms = squareWave(counts.square);
        return;
    }
    const picked = shapeTerms[mode].slice(0, counts[mode]);
    terms = sorted ? picked : [...picked].sort((a, b) => a.freq - b.freq);
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

const freehand = createFreehand(stage.canvas, (stroke) => {
    const view = shapeView();
    const points = stroke.map((p) => fromScreen(p, view));
    shapeTerms.draw = byAmplitude(
        dft(normalize(resample(points, SHAPE_POINTS))),
    );
    t = 0;
    updateTerms();
});

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Draw a closed shape';
app.append(hint);

const setMode = (m: Mode) => {
    mode = m;
    freehand.enabled = mode === 'draw';
    app.classList.toggle('drawing', freehand.enabled);
    svgBox.row.hidden = mode !== 'svg';
    slider.set(counts[mode], mode === 'square' ? SQUARE_MAX : SHAPE_POINTS);
    updateTerms();
};

const panel = createPanel(app);

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

const svgBox = addTextBox(panel, {
    value: EXAMPLE_SVG,
    placeholder: 'Paste an SVG file or path data',
    button: 'Use path',
    onSubmit: (text) => {
        try {
            shapeTerms.svg = svgTerms(text);
            svgBox.setError('');
            t = 0;
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

addToggle(panel, {
    label: 'Sort by size',
    value: sorted,
    onChange: (s) => {
        sorted = s;
        updateTerms();
    },
});

setMode(mode);

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
        const view: Viewport = {
            origin: { x: width * 0.25, y: height / 2 },
            scale: Math.min(width * 0.12, height * 0.28),
        };
        const graph: Graph = { left: width * 0.5, width: width * 0.45 };
        drawWave(ctx, terms, t, view, graph);
        drawEpicycles(ctx, chain(terms, t), view);
        return;
    }

    if (drawing) {
        drawStroke(freehand.stroke);
        return;
    }
    if (terms.length === 0) return;

    // Lazily, so a slider drag recomputes at most once per frame
    trace ??= tracePath(terms, traceSamples());

    const view = shapeView();
    drawTrace(ctx, trace, view);
    drawEpicycles(ctx, chain(terms, t), view);
}

createLoop((dt) => {
    t = (t + speed * dt) % TAU;
    draw();
}).start();
