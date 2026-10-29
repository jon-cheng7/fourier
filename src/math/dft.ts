// Discrete Fourier Transform: closed path of points to epicycle terms

import type { Point, Term } from "./types";

const TAU = Math.PI * 2;

export function dft(points: Point[]): Term[] {
    const N = points.length;
    const half = Math.floor(N / 2);
    const terms: Term[] = []

    for (let k = -half; k < N - half; k++) {
        let re = 0;
        let im = 0;

        for (let n =0; n < N; n++) {
            const { x, y } = points[n];
            const angle = (TAU * k * n);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            re += x * cos + y * sin;
            im += y * cos - x * sin;
        }

        re /= N;
        im /= N;

        terms.push({
            freq: k,
            amp: Math.hypot(re, im),
            phase: Math.atan2(im, re),
        });
    }
    return terms;
}

// sorts the circles biggest first
export function byAmplitude(terms: Term[]) : Term[] {
    return [...terms].sort((a, b) => b.amp - a.amp);
}
