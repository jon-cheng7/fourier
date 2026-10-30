// Traced wave: tip height over the last full cycle

import type { Term } from '../math/types';
import { tipAt } from '../math/epicycles';
import { toScreen, type Viewport } from './viewport';

const TAU = Math.PI * 2;
const SAMPLE_PX = 2;

export interface Graph {
    left: number;
    width: number;
}

export function drawWave(
    ctx: CanvasRenderingContext2D,
    terms: Term[],
    t: number,
    view: Viewport,
    graph: Graph,
): void {
    const tip = toScreen(tipAt(terms, t), view);
    const axisY = view.origin.y;

    // axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(graph.left, axisY);
    ctx.lineTo(graph.left + graph.width, axisY);
    ctx.stroke();

    // connector from tip to graph
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(graph.left, tip.y);
    ctx.stroke();

    // wave: one sample every few screen px, only where it's visible, so it stays smooth when zoomed
    const from = Math.max(graph.left, 0);
    const to = Math.min(graph.left + graph.width, ctx.canvas.clientWidth);
    ctx.strokeStyle = '#c5fb45';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = from; x <= to + SAMPLE_PX; x += SAMPLE_PX) {
        const f = Math.min((x - graph.left) / graph.width, 1);
        const p = tipAt(terms, t - f * TAU);
        const y = toScreen({ x: 0, y: p.y }, view).y;
        ctx.lineTo(Math.min(x, graph.left + graph.width), y);
    }
    ctx.stroke();
}
