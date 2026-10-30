// Built-in closed paths for the DFT

import type { Point } from "./types";

const TAU = Math.PI * 2;

export function heart(count: number): Point[] {
    return Array.from({ length: count }, (_, i) => {
        const s = (i / count) * TAU;
        return  {
            x: Math.sin(s) ** 3,
            y:
                (13 * Math.cos(s) -
                    5 * Math.cos(2 * s) -
                    2 * Math.cos(3 * s) -
                    Math.cos(4 * s)) /
                16,
        };
    });
}