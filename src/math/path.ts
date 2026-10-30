// Cleans raw closed paths for the DFT: even spacing, centred, unit size

import type { Point } from './types';

export function resample(points: Point[], count: number): Point[] {
    const closed = [...points, points[0]];

    const cumulative = [0];
    for (let i = 1; i < closed.length; i++) {
        const a = closed[i - 1];
        const b = closed[i];
        cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    const total = cumulative[cumulative.length - 1];

    const result: Point[] = [];
    let seg = 0;
    for (let j = 0; j < count; j++) {
        const target = (j / count) * total;
        while (cumulative[seg + 1] < target) seg++;

        const a = closed[seg];
        const b = closed[seg + 1];
        const length = cumulative[seg + 1] - cumulative[seg];
        const f = length === 0 ? 0 : (target - cumulative[seg]) / length;
        result.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }

    return result;
}

export function normalize(points: Point[]): Point[] {
    const n = points.length;
    const cx = points.reduce((sum, p) => sum + p.x, 0) / n;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / n;

    const radius = Math.max(
        ...points.map((p) => Math.hypot(p.x - cx, p.y - cy)),
    );
    const s = radius === 0 ? 1 : 1 / radius;

    return points.map((p) => ({ x: (p.x - cx) * s, y: (p.y - cy) * s }));
}
