// SVG input: path data to evenly spaced points along the path

import type { Point } from '../math/types';
import { fromScreen } from '../views/viewport';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function pathData(source: string): string {
    const text = source.trim();
    if (!text.startsWith('<')) return text;

    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const d = doc.querySelector('path')?.getAttribute('d');
    if (!d) throw new Error('No <path> found in the SVG');
    return d;
}

export function samplePath(d: string, count: number): Point[] {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    svg.style.position = 'absolute';
    svg.style.visibility = 'hidden';
    document.body.append(svg);

    try {
        const total = path.getTotalLength();
        if (!(total > 0)) throw new Error('Path has no length');

        const flip = { origin: { x: 0, y: 0 }, scale: 1 };
        return Array.from({ length: count }, (_, i) => {
            const p = path.getPointAtLength((i / count) * total);
            return fromScreen({ x: p.x, y: p.y }, flip);
        });
    } finally {
        svg.remove();
    }
}
