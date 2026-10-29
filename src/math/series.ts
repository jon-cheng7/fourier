import type { Term } from './types';

export function squareWave(count: number): Term[] {
    return Array.from({ length: count }, (_, i) => {
        const n = 2 * i + 1;
        return {
            freq: n,
            amp: 4 / (Math.PI * n),
            phase: 0,
        };
    });
}
