// Path traced by the pen tip over the last full cycle

import type { Term } from '../math/types';
import { tipAt } from '../math/epicycles';
import { toScreen, type Viewport } from './viewport';

const TAU = Math.PI * 2;
const SAMPLES = 600;

export function drawTrace(
    ctx: CanvasRenderingContext2D,
    terms: Term[],
    t: number,
    view: Viewport,
): void {
    ctx.strokeStyle = '#c5fb45';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
        const p = toScreen(tipAt(terms, t - (i / SAMPLES) * TAU), view);
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
}
