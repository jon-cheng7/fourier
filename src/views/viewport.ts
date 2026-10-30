// Math units to screen pixels

import type { Point } from '../math/types';

export interface Viewport {
    origin: Point;
    scale: number;
}

// Converts math units to screen pixels
export function toScreen(p: Point, view: Viewport): Point {
    return {
        x: view.origin.x + p.x * view.scale,
        y: view.origin.y - p.y * view.scale,
    };
}

// Converts screen pixels to math units
export function fromScreen(p: Point, view: Viewport): Point {
    return {
        x: (p.x - view.origin.x) / view.scale,
        y: (view.origin.y - p.y) / view.scale,
    };
}
