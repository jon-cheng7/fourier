// Entry point. Wires stage, loop, views and controls.

import './style.css';
import { createStage } from './stage';
import { createLoop } from './loop';
import { createPanel, addSlider, addChoice, addToggle } from './controls';
import { squareWave } from './math/series';
import { chain } from './math/epicycles';
import { dft, byAmplitude } from './math/dft';
import { heart } from './math/shapes';
import type { Term } from './math/types';
import { drawEpicycles } from './views/epicycles';
import type { Viewport } from './views/viewport';
import { drawWave, type Graph } from './views/wave';
import { drawTrace } from './views/trace';

type Mode = 'square' | 'heart';

const TAU = Math.PI * 2;
const SQUARE_MAX = 50;
const HEART_POINTS = 200;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const stage = createStage(app);
const { ctx } = stage;

// Biggest first, so slicing keeps the best approximation
const heartTerms = byAmplitude(dft(heart(HEART_POINTS)));

let mode: Mode = 'square';
const counts: Record<Mode, number> = { square: 5, heart: HEART_POINTS };
let sorted = true;
let terms: Term[] = [];
let t = 0;
const speed = TAU / 8; // rad/s

function updateTerms() {
    if (mode === 'square') {
        terms = squareWave(counts.square);
        return;
    }
    const picked = heartTerms.slice(0, counts.heart);
    terms = sorted ? picked : [...picked].sort((a, b) => a.freq - b.freq);
}

const panel = createPanel(app);

addChoice<Mode>(panel, {
    options: [
        { value: 'square', label: 'Square wave' },
        { value: 'heart', label: 'Heart' },
    ],
    value: mode,
    onChange: (m) => {
        mode = m;
        slider.set(counts[mode], mode === 'square' ? SQUARE_MAX : HEART_POINTS);
        updateTerms();
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

updateTerms();

function draw() {
    const { width, height } = stage;
    ctx.clearRect(0, 0, width, height);

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

    const view: Viewport = {
        origin: { x: width / 2, y: height / 2 },
        scale: Math.min(width, height) * 0.35,
    };
    drawTrace(ctx, terms, t, view);
    drawEpicycles(ctx, chain(terms, t), view);
}

createLoop((dt) => {
    t = (t + speed * dt) % TAU;
    draw();
}).start();
