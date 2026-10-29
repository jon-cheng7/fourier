// Epicycle positions: joint and tip

import type { Point, Term } from './types';

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
