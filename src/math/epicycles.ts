// Epicycle positions: joint and tip

import type { Point, Term } from './types';

const TAU = Math.PI * 2;

export function chain(terms: Term[], t: number): Point[] {
    const points: Point[] = [{ x: 0, y: 0 }];
    let x = 0;
    let y = 0;

    for (const { freq, amp, phase } of terms) {
        const angle = freq * t + phase;
        x += amp * Math.cos(angle);
        y += amp * Math.sin(angle);
        points.push({ x, y });
    }

    return points;
}

export function tipAt(terms: Term[], t: number): Point {
    let x = 0;
    let y = 0;

    for (const { freq, amp, phase } of terms) {
        const angle = freq * t + phase;
        x += amp * Math.cos(angle);
        y += amp * Math.sin(angle);
    }
    return { x, y };
}

// One full cycle of the tip. Needs > 2× the highest |freq| or fast circles alias
export function tracePath(terms: Term[], samples: number): Point[] {
    return Array.from({ length: samples }, (_, i) =>
        tipAt(terms, (i / samples) * TAU),
    );
}

// Each circle → a mirrored half-size pair. x: vertical parts cancel. y: horizontal parts cancel
export function splitTerms(terms: Term[]): { x: Term[]; y: Term[] } {
    const x: Term[] = [];
    const y: Term[] = [];

    for (const { freq, amp, phase } of terms) {
        const half = amp / 2;
        x.push({ freq, amp: half, phase });
        x.push({ freq: -freq, amp: half, phase: -phase });
        y.push({ freq, amp: half, phase });
        y.push({ freq: -freq, amp: half, phase: Math.PI - phase });
    }

    return { x, y };
}
