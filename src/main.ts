// Entry point. Wires stage, loop and drawing.

import './style.css';
import { createStage } from './stage';
import { createLoop } from './loop';

const TAU = Math.PI * 2;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const stage = createStage(app);
const { ctx } = stage;

let t = 0;
const speed = TAU / 8; // rad/s

// Placeholder orbit
function draw() {
    const { width, height } = stage;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const r = 0.35 * Math.min(width, height);
    const x = r * Math.cos(t);
    const y = -r * Math.sin(t); // canvas y points down

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = '#c5fb45';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, TAU);
    ctx.fill();

    ctx.restore();
}

createLoop((dt) => {
    t = (t + speed * dt) % TAU;
    draw();
}).start();
