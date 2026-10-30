// Which circle of a chain is under the cursor: the nearest ring within a few px, skipping specks

import type { Point } from '../math/types';

const MIN_RADIUS_PX = 3;

// screen: chain joints in screen px. Returns the circle index, or -1
export function pickCircle(screen: Point[], at: Point, tolerance = 6): number {
    let best = -1;
    let bestGap = tolerance;
    for (let i = 0; i < screen.length - 1; i++) {
        const c = screen[i];
        const next = screen[i + 1];
        const r = Math.hypot(next.x - c.x, next.y - c.y);
        if (r < MIN_RADIUS_PX) continue;
        const gap = Math.abs(Math.hypot(at.x - c.x, at.y - c.y) - r);
        if (gap < bestGap) {
            best = i;
            bestGap = gap;
        }
    }
    return best;
}
