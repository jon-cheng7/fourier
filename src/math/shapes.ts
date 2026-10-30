// Built-in closed paths for the DFT. Curves from a formula are sampled evenly in their own
// parameter (so a trig formula stays a short series); straight-edged ones by arc length

import type { Point } from './types';
import { resample } from './path';

const TAU = Math.PI * 2;

export interface ShapePreset {
    id: string;
    label: string;
    // One or two sentences on the maths, shown under the picker
    about: string;
    points(count: number): Point[];
}

// count points of (x(s), y(s)) for s over [0, span), not repeating the start
function curve(count: number, span: number, f: (s: number) => Point): Point[] {
    return Array.from({ length: count }, (_, i) => f((i / count) * span));
}

function polygon(count: number, corners: Point[]): Point[] {
    return resample(corners, count);
}

export function heart(count: number): Point[] {
    return curve(count, TAU, (s) => ({
        x: Math.sin(s) ** 3,
        y:
            (13 * Math.cos(s) -
                5 * Math.cos(2 * s) -
                2 * Math.cos(3 * s) -
                Math.cos(4 * s)) /
            16,
    }));
}

function star(count: number, tips: number, inner: number): Point[] {
    const corners = Array.from({ length: tips * 2 }, (_, i) => {
        const r = i % 2 === 0 ? 1 : inner;
        const a = Math.PI / 2 + (i * Math.PI) / tips;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return polygon(count, corners);
}

// Each side → four sides a third as long, with a bump in the middle
function koch(count: number, levels: number): Point[] {
    let corners: Point[] = [0, 1, 2].map((i) => {
        const a = Math.PI / 2 + (i * TAU) / 3;
        return { x: Math.cos(a), y: Math.sin(a) };
    });
    for (let level = 0; level < levels; level++) {
        const next: Point[] = [];
        corners.forEach((a, i) => {
            const b = corners[(i + 1) % corners.length];
            const dx = (b.x - a.x) / 3;
            const dy = (b.y - a.y) / 3;
            const p = { x: a.x + dx, y: a.y + dy };
            const q = { x: a.x + 2 * dx, y: a.y + 2 * dy };
            // Bump: rotate the middle third by −60° (outward for this winding)
            const c = Math.cos(-Math.PI / 3);
            const s = Math.sin(-Math.PI / 3);
            const peak = { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c };
            next.push(a, p, peak, q);
        });
        corners = next;
    }
    return polygon(count, corners);
}

const sign = (x: number) => (x < 0 ? -1 : 1);

export const SHAPES: ShapePreset[] = [
    {
        id: 'heart',
        label: 'Heart',
        about: 'x = sin³t, y = (13 cos t − 5 cos 2t − 2 cos 3t − cos 4t)/16. Only a handful of sines, so only a handful of circles matter.',
        points: heart,
    },
    {
        id: 'ellipse',
        label: 'Ellipse',
        about: 'Exactly two circles of different sizes spinning opposite ways. Every other term is zero.',
        points: (n) =>
            curve(n, TAU, (s) => ({
                x: 1.4 * Math.cos(s),
                y: 0.8 * Math.sin(s),
            })),
    },
    {
        id: 'square',
        label: 'Square',
        about: 'Four straight sides, four sharp corners. Corners need endless small circles, so watch them wobble (Gibbs) at low term counts.',
        points: (n) =>
            polygon(n, [
                { x: 1, y: 1 },
                { x: -1, y: 1 },
                { x: -1, y: -1 },
                { x: 1, y: -1 },
            ]),
    },
    {
        id: 'star',
        label: 'Star',
        about: 'Ten corners pointing in and out. The circles spinning 5× faster than the outline do most of the work.',
        points: (n) => star(n, 5, 0.4),
    },
    {
        id: 'astroid',
        label: 'Astroid',
        about: 'x = cos³t, y = sin³t. Four sharp cusps, yet it’s exactly two circles: a big one and one a third the size spinning 3× the other way.',
        points: (n) =>
            curve(n, TAU, (s) => ({
                x: Math.cos(s) ** 3,
                y: Math.sin(s) ** 3,
            })),
    },
    {
        id: 'deltoid',
        label: 'Deltoid',
        about: 'A circle rolling inside one three times its size. Two circles, three cusps.',
        points: (n) =>
            curve(n, TAU, (s) => ({
                x: 2 * Math.cos(s) + Math.cos(2 * s),
                y: 2 * Math.sin(s) - Math.sin(2 * s),
            })),
    },
    {
        id: 'cardioid',
        label: 'Cardioid',
        about: 'r = 1 − cos θ: the path of a point on a circle rolling around another the same size. Two circles (plus the centre).',
        points: (n) =>
            curve(n, TAU, (s) => {
                const r = 1 - Math.cos(s);
                return { x: r * Math.cos(s), y: r * Math.sin(s) };
            }),
    },
    {
        id: 'rose',
        label: 'Rose',
        about: 'r = cos 5θ: five petals from just two equal circles, spinning opposite ways at 3× and 2× per cycle.',
        points: (n) =>
            curve(n, Math.PI, (s) => {
                const r = Math.cos(5 * s);
                return { x: r * Math.cos(s), y: r * Math.sin(s) };
            }),
    },
    {
        id: 'lissajous',
        label: 'Lissajous',
        about: 'x and y are sine waves at a 3 : 2 frequency ratio, the figure an oscilloscope draws. Four circles.',
        points: (n) =>
            curve(n, TAU, (s) => ({ x: Math.cos(3 * s), y: Math.sin(2 * s) })),
    },
    {
        id: 'spirograph',
        label: 'Spirograph',
        about: 'A hypotrochoid: a pen on a wheel rolling inside a ring (R = 5, r = 3). Two circles trace all its loops.',
        points: (n) =>
            curve(n, 3 * TAU, (s) => ({
                x: 2 * Math.cos(s) + 5 * Math.cos((2 / 3) * s),
                y: 2 * Math.sin(s) - 5 * Math.sin((2 / 3) * s),
            })),
    },
    {
        id: 'lemniscate',
        label: 'Lemniscate',
        about: 'Bernoulli’s figure eight. Its formula has a fraction in it, so unlike the trig curves it needs many circles.',
        points: (n) =>
            curve(n, TAU, (s) => {
                const d = 1 + Math.sin(s) ** 2;
                return {
                    x: Math.cos(s) / d,
                    y: (Math.sin(s) * Math.cos(s)) / d,
                };
            }),
    },
    {
        id: 'squircle',
        label: 'Squircle',
        about: 'x⁴ + y⁴ = 1, halfway between a circle and a square. Looks smooth, but takes more circles than you’d guess.',
        points: (n) =>
            curve(n, TAU, (s) => ({
                x: sign(Math.cos(s)) * Math.sqrt(Math.abs(Math.cos(s))),
                y: sign(Math.sin(s)) * Math.sqrt(Math.abs(Math.sin(s))),
            })),
    },
    {
        id: 'koch',
        label: 'Koch snowflake',
        about: 'A fractal: every side replaced by four smaller ones, four times over. However many circles you add, there’s finer detail left.',
        points: (n) => koch(n, 4),
    },
];
