// Math units to screen pixels

import type { Point } from '../math/types';

export interface Viewport {
    origin: Point;
    scale: number;
}

export function toScreen(p: Point, view: Viewport): Point {
    return {
        x: view.origin.x + p.x * view.scale,
        y: view.origin.y + p.y * view.scale,
    };
}