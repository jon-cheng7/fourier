// Closed path traced by the pen tip. Same every frame, so computed once per term set

import type { Point } from '../math/types';
import { toScreen, type Viewport } from './viewport';

export function drawTrace(
    ctx: CanvasRenderingContext2D,
    path: Point[],
    view: Viewport,
): void {
    ctx.strokeStyle = '#c5fb45';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const p of path) {
        const s = toScreen(p, view);
        ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
    ctx.stroke();
}
