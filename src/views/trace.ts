// Closed path traced by the pen tip, computed once per term set. Optional fading trail

import type { Point } from '../math/types';
import { toScreen, type Viewport } from './viewport';

const COLOUR = '197, 251, 69';
const FADE_STEPS = 24;

// head: pen position as a fraction of the cycle. trail: fraction of the cycle shown (1 = whole shape)
export function drawTrace(
    ctx: CanvasRenderingContext2D,
    path: Point[],
    view: Viewport,
    head = 0,
    trail = 1,
): void {
    const n = path.length;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (trail >= 1) {
        ctx.strokeStyle = `rgb(${COLOUR})`;
        ctx.beginPath();
        for (const p of path) {
            const s = toScreen(p, view);
            ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.stroke();
        return;
    }

    // Chunks share end points so the line stays joined; older chunks fainter
    const end = Math.round(head * n);
    const count = Math.max(2, Math.round(trail * n));
    for (let step = 0; step < FADE_STEPS; step++) {
        const from = Math.floor((count * step) / FADE_STEPS);
        const to = Math.floor((count * (step + 1)) / FADE_STEPS);
        ctx.strokeStyle = `rgba(${COLOUR}, ${(step + 1) / FADE_STEPS})`;
        ctx.beginPath();
        for (let k = from; k <= to; k++) {
            const i = (((end - count + k) % n) + n) % n;
            const s = toScreen(path[i], view);
            ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
    }
}
