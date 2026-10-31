// Live equation bar: the series being drawn, written out, with its biggest terms as hoverable chips.
// Hovering a chip highlights that circle; every symbol has a tip explaining it

import type { Term } from '../math/types';

export type SeriesKind = 'wave' | 'shape';

export interface Equation {
    set(kind: SeriesKind | null, terms: Term[], sorted: boolean): void;
}

const CHIPS = 6;

const num = (x: number, d = 2) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
const deg = (rad: number) =>
    Math.round(((((rad * 180) / Math.PI) % 360) + 360) % 360);

const T = '<var>t</var>';

// k t with tidy coefficients: t, −t, 3t
function kt(k: number): string {
    if (k === 1) return T;
    if (k === -1) return `−${T}`;
    return `${num(k, 0)}${T}`;
}

function chipLabel(kind: SeriesKind, term: Term): string {
    if (kind === 'wave') {
        const n = term.freq === 1 ? '' : term.freq;
        return `${term.amp.toFixed(3)} sin ${n}${T}`;
    }
    const phase = term.phase >= 0 ? `+${num(term.phase)}` : num(term.phase);
    const exp =
        term.freq === 0
            ? `<var>i</var>·${num(term.phase)}`
            : `<var>i</var>(${kt(term.freq)}${phase})`;
    return `${term.amp.toFixed(2)}e<sup>${exp}</sup>`;
}

// What one circle is and where it came from. Used by chips and by hovering circles on the canvas
export function describeTerm(
    kind: SeriesKind,
    term: Term,
    index: number,
    total: number,
    note = '',
): string {
    const { freq: k, amp, phase } = term;
    const ks = num(k, 0);
    const head = `<b>Circle ${index + 1} of ${total}</b>`;
    if (kind === 'wave') {
        return `${head} · harmonic n = ${k}<br>
Turns ${k}× per cycle, radius ${k === 1 ? '4/π' : `4/(${k}π)`} ≈ ${amp.toFixed(3)}.<br>
Its height adds ${amp.toFixed(3)}·sin ${k === 1 ? '' : k}t to the wave.${note}<br>
<i>Only odd n: half a cycle later a square wave is upside down, and only odd harmonics flip with it.</i>`;
    }
    const spin =
        k === 0
            ? 'Doesn’t spin: a fixed offset, the centre of the shape.'
            : `Spins ${Math.abs(k)}× per cycle, ${k > 0 ? 'counter-clockwise' : 'clockwise'}.`;
    return `${head} · k = ${k > 0 ? '+' : ''}${ks}<br>
${spin}<br>
Radius |c<sub>${ks}</sub>| = ${amp.toFixed(3)}, starts at ${deg(phase)}° (its phase).<br>
As a complex number c<sub>${ks}</sub> = ${amp.toFixed(3)}·e<sup>i·${num(phase)}</sup>.${note}<br>
<i>The DFT found it by spinning every point of the shape back ${Math.abs(k)} turn${Math.abs(k) === 1 ? '' : 's'} and averaging.</i>`;
}

const TIPS = {
    howWave: `<b>How it works</b><br>
1. A square wave is a sum of sine waves at odd frequencies 1, 3, 5…, each 1/n as tall.<br>
2. Each sine wave is the height of a point on a spinning circle.<br>
3. Chain the circles tip to tail; the last tip’s height traces the wave.`,
    howShape: `<b>How it works</b><br>
1. The shape is sampled as evenly spaced points, each a complex number x + iy.<br>
2. The discrete Fourier transform turns N points into N circles (one per frequency k).<br>
3. Chained tip to tail, the circles’ last tip retraces the shape exactly.`,
    f: 'The pen’s height at time t. One cycle is t from 0 to 2π.',
    sumWave:
        'Add up one sine wave per odd harmonic n. More terms sharpen the corners, but the overshoot at each jump (Gibbs) never goes away; it just gets narrower.',
    sinnt: 'sin nt is the height of a point turning n times per cycle on a circle of radius 1.',
    z: 'The pen’s position at time t, as one complex number x + iy. One cycle is t from 0 to 2π.',
    sumShape:
        'Add every circle’s arm, tip to tail. Addition doesn’t care about order, so sorting only changes how the arm moves, not the drawing.',
    c: 'One complex number per circle: its length is the radius, its angle is where the circle starts (phase). The DFT computes them from the shape’s points.',
    e: 'A point going round a circle of radius 1, k times per cycle: e<sup>ikt</sup> = cos kt + i sin kt (Euler’s formula). Negative k spins the other way.',
};

export function createEquation(
    container: HTMLElement,
    onHover: (index: number) => void,
): Equation {
    const el = document.createElement('div');
    el.className = 'equation';
    el.hidden = true;
    container.append(el);

    el.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse') return;
        const chip = (e.target as Element).closest<HTMLElement>('[data-index]');
        onHover(chip ? Number(chip.dataset.index) : -1);
    });
    el.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') onHover(-1);
    });

    // Touch: a tapped chip stays lit until the next tap anywhere (same tap toggles it off)
    let pinned = -1;
    container.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        const chip =
            e.target instanceof Element && el.contains(e.target)
                ? e.target.closest<HTMLElement>('[data-index]')
                : null;
        const i = chip ? Number(chip.dataset.index) : -1;
        pinned = i === pinned ? -1 : i;
        onHover(pinned);
    });

    const span = (cls: string, html: string, tip: string) =>
        `<span class="${cls} has-tip" data-tip="${tip.replace(/"/g, '&quot;')}">${html}</span>`;

    return {
        set(kind, terms, sorted) {
            el.hidden = kind === null || terms.length === 0;
            if (el.hidden || kind === null) return;

            const lhs =
                kind === 'wave'
                    ? `${span('how', 'How it works', TIPS.howWave)}
                       ${span('sym', '<var>f</var>(<var>t</var>)', TIPS.f)} =
                       ${span('sym', 'Σ<sub><var>n</var> odd</sub>', TIPS.sumWave)}
                       ${span('sym', '<sup>4</sup>⁄<sub>π<var>n</var></sub> sin <var>nt</var>', TIPS.sinnt)}`
                    : `${span('how', 'How it works', TIPS.howShape)}
                       ${span('sym', '<var>z</var>(<var>t</var>)', TIPS.z)} =
                       ${span('sym', 'Σ', TIPS.sumShape)}
                       ${span('sym', '<var>c</var><sub><var>k</var></sub>', TIPS.c)}${span('sym', 'e<sup><var>ikt</var></sup>', TIPS.e)}`;

            const chips = terms
                .slice(0, CHIPS)
                .map(
                    (term, i) =>
                        `<span class="chip has-tip" data-index="${i}" data-tip="${describeTerm(kind, term, i, terms.length).replace(/"/g, '&quot;')}">${chipLabel(kind, term)}</span>`,
                )
                .join('<span class="plus">+</span>');

            const rest = terms.length - CHIPS;
            const more =
                rest > 0
                    ? `<span class="plus">+</span>${span(
                          'more',
                          `${rest} more`,
                          `${rest} smaller circles, ${sorted || kind === 'wave' ? 'biggest first' : 'in frequency order'}. Each adds finer detail.`,
                      )}`
                    : '';

            el.innerHTML = `<div class="eq-row">${lhs}</div><div class="eq-row eq-terms">= ${chips}${more}</div>`;
        },
    };
}
