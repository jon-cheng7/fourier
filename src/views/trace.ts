// Path traced by the pen tip. Coarse path computed once per term set; long on-screen segments
// get extra samples when zoomed in, cached per zoom level. Optional fading trail

import type { Point, Term } from '../math/types';
import { tipAt } from '../math/epicycles';
import { toScreen, type Viewport } from './viewport';

const TAU = Math.PI * 2;
const COLOUR = '197, 251, 69';
const FADE_STEPS = 24;
const MAX_SEGMENT_PX = 3;
const MAX_PIECES = 256;

export interface Trace {
    // head: pen position as a fraction of the cycle. trail: fraction shown (1 = whole shape)
    draw(
        ctx: CanvasRenderingContext2D,
        view: Viewport,
        head: number,
        trail: number,
    ): void;
}

export function createTrace(terms: Term[], path: Point[]): Trace {
    const n = path.length;
    const refined = new Map<number, Point[]>();
    let level = 0;

    // Points strictly inside segment i (i → i+1), in maths units
    const inside = (i: number): Point[] => {
        const cached = refined.get(i);
        if (cached) return cached;
        const a = path[i];
        const b = path[(i + 1) % n];
        const px = Math.hypot(b.x - a.x, b.y - a.y) * 2 ** (level + 0.5);
        const pieces = Math.min(MAX_PIECES, Math.ceil(px / MAX_SEGMENT_PX));
        const points: Point[] = [];
        for (let j = 1; j < pieces; j++) {
            points.push(tipAt(terms, ((i + j / pieces) / n) * TAU));
        }
        refined.set(i, points);
        return points;
    };

    return {
        draw(ctx, view, head, trail) {
            const zoomLevel = Math.round(Math.log2(view.scale));
            if (zoomLevel !== level) {
                refined.clear();
                level = zoomLevel;
            }

            const w = ctx.canvas.clientWidth;
            const h = ctx.canvas.clientHeight;
            const off = (p: Point) =>
                p.x < 0 ? -1 : p.x > w ? 1 : p.y < 0 ? -2 : p.y > h ? 2 : 0;

            // Draws segments start .. start+count-1 (indices wrap) as one stroke
            const stroke = (start: number, count: number, style: string) => {
                ctx.strokeStyle = style;
                ctx.beginPath();
                let a = toScreen(path[((start % n) + n) % n], view);
                ctx.moveTo(a.x, a.y);
                for (let k = 0; k < count; k++) {
                    const i = (((start + k) % n) + n) % n;
                    const b = toScreen(path[(i + 1) % n], view);
                    const long =
                        Math.hypot(b.x - a.x, b.y - a.y) > MAX_SEGMENT_PX;
                    // Skip refining segments wholly off one side of the screen
                    const hidden = off(a) !== 0 && off(a) === off(b);
                    if (long && !hidden) {
                        for (const p of inside(i)) {
                            const s = toScreen(p, view);
                            ctx.lineTo(s.x, s.y);
                        }
                    }
                    ctx.lineTo(b.x, b.y);
                    a = b;
                }
                ctx.stroke();
            };

            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            if (trail >= 1) {
                stroke(0, n, `rgb(${COLOUR})`);
                return;
            }

            // Older chunks fainter; chunks share end points so the line stays joined
            const end = Math.round(head * n);
            const count = Math.max(1, Math.round(trail * n));
            for (let step = 0; step < FADE_STEPS; step++) {
                const from = Math.floor((count * step) / FADE_STEPS);
                const to = Math.floor((count * (step + 1)) / FADE_STEPS);
                if (to <= from) continue;
                const alpha = (step + 1) / FADE_STEPS;
                stroke(
                    end - count + from,
                    to - from,
                    `rgba(${COLOUR}, ${alpha})`,
                );
            }
        },
    };
}
