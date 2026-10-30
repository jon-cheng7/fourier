// Draws the epicycle chain: circles, arm and pen tip

import type { Point } from '../math/types';
import { toScreen, type Viewport } from './viewport';

const TAU = Math.PI * 2;

export function drawEpicycles(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    view: Viewport,
    showCircles = true,
    highlight: number[] = [],
): void {
    const screen = points.map((p) => toScreen(p, view));

    ctx.lineWidth = 1;

    // circles
    if (showCircles) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        for (let i = 0; i < screen.length - 1; i++) {
            const centre = screen[i];
            const next = screen[i + 1];
            const r = Math.hypot(next.x - centre.x, next.y - centre.y);
            ctx.moveTo(centre.x + r, centre.y);
            ctx.arc(centre.x, centre.y, r, 0, TAU);
        }
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();

    // arm
    for (const p of screen) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // highlighted circles (hovered on canvas or in the equation): ring, radius, centre
    ctx.strokeStyle = '#c5fb45';
    ctx.fillStyle = '#c5fb45';
    for (const i of highlight) {
        if (i < 0 || i >= screen.length - 1) continue;
        const centre = screen[i];
        const next = screen[i + 1];
        const r = Math.hypot(next.x - centre.x, next.y - centre.y);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, r, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centre.x, centre.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, 2.5, 0, TAU);
        ctx.fill();
    }

    // tip
    const tip = screen[screen.length - 1];
    ctx.fillStyle = '#c5fb45';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3, 0, TAU);
    ctx.fill();
}
