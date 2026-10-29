// Draws the epicycle chain: circles, arm and pen tip

import type { Point } from '../math/types';
import { toScreen, type Viewport } from './viewport';

const TAU = Math.PI * 2;

export function drawEpicycles(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    view: Viewport,
): void {
    const screen = points.map((p) => toScreen(p, view));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // circles
    for (let i = 0; i < screen.length - 1; i++) {
        const centre = screen[i];
        const next = screen[i + 1];
        const r = Math.hypot(next.x - centre.x, next.y - centre.y);
        ctx.moveTo(centre.x + r, centre.y);
        ctx.arc(centre.x, centre.y, r, 0, TAU);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();

    // arm
    for (const p of screen) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // tip
    const tip = screen[screen.length - 1];
    ctx.fillStyle = '#c5fb45';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3, 0, TAU);
    ctx.fill();
}
