// Entry point. Wires stage, loop, views and controls.

import './style.css';
import { createStage } from './stage';
import { createLoop } from './loop';
import { createPanel, addSlider } from './controls';
import { squareWave } from './math/series';
import { chain } from './math/epicycles';
import type { Term } from './math/types';
import { drawEpicycles } from './views/epicycles';
import type { Viewport } from './views/viewport';
import { drawWave, type Graph } from './views/wave';

const TAU = Math.PI * 2;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const stage = createStage(app);
const { ctx } = stage;

let count = 5;
let terms: Term[] = squareWave(count);
let t = 0;
const speed = TAU / 8; // rad/s

const panel = createPanel(app);
addSlider(panel, {
    label: 'Terms',
    min: 1,
    max: 50,
    value: count,
    onInput: (n) => {
        count = n;
        terms = squareWave(count);
    },
});

function draw() {
    const { width, height } = stage;
    ctx.clearRect(0, 0, width, height);

    const view: Viewport = {
        origin: { x: width * 0.25, y: height / 2 },
        scale: Math.min(width * 0.12, height * 0.28),
    };

    const graph: Graph = { left: width * 0.5, width: width * 0.45 };

    drawWave(ctx, terms, t, view, graph);
    drawEpicycles(ctx, chain(terms, t), view);
}

createLoop((dt) => {
    t = (t + speed * dt) % TAU;
    draw();
}).start();
