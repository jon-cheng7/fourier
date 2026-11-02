// Lesson cards: each one sets the drawing up, then explains what's on screen

export type LessonMode = 'wave' | 'shape' | 'draw' | 'svg';

export interface LessonStage {
    setMode(mode: LessonMode): void;
    setShape(id: string): void;
    /** clamped to what the mode allows; Infinity = every term */
    setTerms(n: number): void;
    setLayout(layout: 'radial' | 'split'): void;
    setSorted(on: boolean): void;
    setCircles(on: boolean): void;
    resetView(): void;
}

interface Lesson {
    title: string;
    /** trusted HTML, may hold MathML */
    body: string;
    tryIt?: { touch: string; mouse: string };
    setup(stage: LessonStage): void;
}

const t = '<mi>t</mi>';
const sub = (base: string, n: string): string =>
    `<msub><mi>${base}</mi><mi>${n}</mi></msub>`;

const SQUARE = `<math display="block"><mi>f</mi><mo>(</mo>${t}<mo>)</mo><mo>=</mo><mfrac><mn>4</mn><mi>π</mi></mfrac><mrow><mo>(</mo><mi>sin</mi><mo>⁡</mo>${t}<mo>+</mo><mfrac><mrow><mi>sin</mi><mo>⁡</mo><mn>3</mn>${t}</mrow><mn>3</mn></mfrac><mo>+</mo><mfrac><mrow><mi>sin</mi><mo>⁡</mo><mn>5</mn>${t}</mrow><mn>5</mn></mfrac><mo>+</mo><mo>…</mo><mo>)</mo></mrow></math>`;

const CIRCLE = `<math display="block">${sub('c', 'k')}<msup><mi>e</mi><mrow><mi>i</mi><mi>k</mi>${t}</mrow></msup></math>`;

const DFT = `<math display="block">${sub('c', 'k')}<mo>=</mo><mfrac><mn>1</mn><mi>N</mi></mfrac><munderover><mo>∑</mo><mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow><mrow><mi>N</mi><mo>−</mo><mn>1</mn></mrow></munderover>${sub('z', 'n')}<msup><mi>e</mi><mrow><mo>−</mo><mn>2</mn><mi>π</mi><mi>i</mi><mi>k</mi><mi>n</mi><mo>/</mo><mi>N</mi></mrow></msup></math>`;

const COS = `<math display="block"><mi>cos</mi><mo>⁡</mo><mi>θ</mi><mo>=</mo><mfrac><mrow><msup><mi>e</mi><mrow><mi>i</mi><mi>θ</mi></mrow></msup><mo>+</mo><msup><mi>e</mi><mrow><mo>−</mo><mi>i</mi><mi>θ</mi></mrow></msup></mrow><mn>2</mn></mfrac></math>`;

/** every lesson starts from the same plain view */
function fresh(s: LessonStage, mode: LessonMode): void {
    s.setMode(mode);
    s.setLayout('radial');
    s.setSorted(true);
    s.setCircles(true);
    s.resetView();
}

const LESSONS: Lesson[] = [
    {
        title: 'ONE CIRCLE',
        body: `<p>An arm spinning at a steady speed. Its tip goes round a circle, and the tip's height over time, plotted on the right, is a sine wave.</p>
<p>Everything here is made of arms like this, each spinning a whole number of times per cycle, joined tip to tail. The tip of the last one is the pen.</p>`,
        tryIt: {
            touch: 'TAP THE CIRCLE TO SEE WHAT IT IS.',
            mouse: 'HOVER THE CIRCLE TO SEE WHAT IT IS.',
        },
        setup(s) {
            fresh(s, 'wave');
            s.setTerms(1);
        },
    },
    {
        title: 'ADDING CIRCLES',
        body: `<p>Put a second arm on the end of the first, spinning three times as fast at a third of the size. Then a third, five times as fast at a fifth. The height of the last tip gets closer and closer to a square wave:</p>${SQUARE}
<p>Only odd speeds, each one 1/n as big. These are known in advance, so nothing has to be worked out.</p>`,
        tryIt: {
            touch: 'DRAG TERMS UP IN CONTROLS.',
            mouse: 'DRAG TERMS UP IN CONTROLS.',
        },
        setup(s) {
            fresh(s, 'wave');
            s.setTerms(5);
        },
    },
    {
        title: 'THE OVERSHOOT',
        body: `<p>Fifty circles. The flat parts are nearly flat, but next to every jump the graph still overshoots by about 9% of the jump.</p>
<p>More circles make that spike thinner, never shorter. A sum of smooth waves can't make a clean jump. This is the Gibbs phenomenon.</p>`,
        setup(s) {
            fresh(s, 'wave');
            s.setTerms(50);
        },
    },
    {
        title: 'ANY CLOSED SHAPE',
        body: `<p>Now the pen moves in two dimensions. Treat each point as a complex number x + iy, and one circle is</p>${CIRCLE}
<p>k turns per cycle, radius |c<sub>k</sub>|, starting angle arg c<sub>k</sub>. To find the circles for a shape, sample N evenly spaced points z<sub>n</sub>, then for each speed spin every point back k turns and average:</p>${DFT}
<p>That's the discrete Fourier transform. N points give N circles, and together they pass through every point.</p>`,
        setup(s) {
            fresh(s, 'shape');
            s.setShape('heart');
            s.setTerms(Infinity);
        },
    },
    {
        title: 'JUST TWO CIRCLES',
        body: `<p>An astroid has four sharp cusps, but it's exactly two circles: a big one, and one a third the size spinning three times as fast the other way. Every other term comes out zero.</p>
<p>Curves made from a few sines and cosines always come out as a few circles.</p>`,
        tryIt: {
            touch: 'TAP THE TERMS ALONG THE TOP.',
            mouse: 'HOVER THE TERMS ALONG THE TOP.',
        },
        setup(s) {
            fresh(s, 'shape');
            s.setShape('astroid');
            s.setTerms(Infinity);
        },
    },
    {
        title: 'CORNERS COST CIRCLES',
        body: `<p>A square with only the 12 biggest circles. The sides are close, but the corners round off and wobble.</p>
<p>A sharp corner needs circles of every speed to build, so the smaller the detail, the more circles it takes. Smooth shapes need few.</p>`,
        tryIt: {
            touch: 'DRAG TERMS AND WATCH THE CORNERS.',
            mouse: 'DRAG TERMS AND WATCH THE CORNERS.',
        },
        setup(s) {
            fresh(s, 'shape');
            s.setShape('square');
            s.setTerms(12);
        },
    },
    {
        title: 'ORDER DOESN’T MATTER',
        body: `<p>The same star, with the circles chained in order of speed instead of biggest first. The arm flails about, but the drawing is identical.</p>
<p>Adding arms is adding numbers, and adding in any order lands on the same tip.</p>`,
        tryIt: {
            touch: 'TURN SORT BY SIZE BACK ON IN CONTROLS.',
            mouse: 'TURN SORT BY SIZE BACK ON IN CONTROLS.',
        },
        setup(s) {
            fresh(s, 'shape');
            s.setShape('star');
            s.setTerms(Infinity);
            s.setSorted(false);
        },
    },
    {
        title: 'SPLIT X AND Y',
        body: `<p>Every circle can be split into two half-size circles spinning opposite ways:</p>${COS}
<p>Their up-down motion cancels, leaving only left-right. Mirror them the other way and only up-down is left. So the top chain draws x, the side chain draws y, and where their guide lines cross is the pen.</p>`,
        setup(s) {
            fresh(s, 'shape');
            s.setShape('heart');
            s.setTerms(Infinity);
            s.setLayout('split');
        },
    },
    {
        title: 'YOUR TURN',
        body: `<p>Draw any closed shape. It's spaced out evenly, centred, then run through the same transform.</p>
<p>Or pick SVG in controls and paste a path from an icon.</p>`,
        tryIt: {
            touch: 'DRAG ON THE CANVAS TO DRAW.',
            mouse: 'DRAG ON THE CANVAS TO DRAW.',
        },
        setup(s) {
            fresh(s, 'draw');
        },
    },
];

export interface Learn {
    readonly open: boolean;
    readonly panel: HTMLElement;
    toggle(): void;
    close(): void;
}

export function createLearn(
    parent: HTMLElement,
    stage: LessonStage,
    onChange: (open: boolean) => void,
): Learn {
    const touch = matchMedia('(pointer: coarse)').matches;
    const el = (tag: string, className: string): HTMLElement => {
        const node = document.createElement(tag);
        node.className = className;
        return node;
    };
    const btn = (text: string, className = 'learn-btn'): HTMLButtonElement => {
        const node = el('button', className) as HTMLButtonElement;
        node.type = 'button';
        node.textContent = text;
        return node;
    };

    const panel = el('section', 'learn');
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Lessons');
    const head = el('div', 'learn-head');
    const count = el('span', 'learn-count');
    const close = btn('Close');
    head.append(count, close);
    const title = el('h2', 'learn-title');
    const body = el('div', 'learn-body');
    const tryIt = el('p', 'learn-try');
    const nav = el('div', 'learn-nav');
    const prev = btn('← Back');
    const dots = el('div', 'learn-dots');
    const next = btn('Next →', 'learn-btn learn-btn-primary');
    const dotEls = LESSONS.map((_, i) => {
        const dot = btn('', 'learn-dot');
        dot.setAttribute('aria-label', `Lesson ${i + 1}`);
        dot.addEventListener('click', () => show(i));
        dots.append(dot);
        return dot;
    });
    nav.append(prev, dots, next);
    panel.append(head, title, body, tryIt, nav);
    parent.append(panel);

    let index = 0;
    let open = false;

    function show(i: number): void {
        index = Math.max(0, Math.min(LESSONS.length - 1, i));
        const lesson = LESSONS[index];
        if (!lesson) return;
        count.textContent = `${index + 1} / ${LESSONS.length}`;
        title.textContent = lesson.title;
        body.innerHTML = lesson.body;
        tryIt.textContent = lesson.tryIt
            ? touch
                ? lesson.tryIt.touch
                : lesson.tryIt.mouse
            : '';
        tryIt.hidden = !lesson.tryIt;
        prev.disabled = index === 0;
        next.textContent =
            index === LESSONS.length - 1 ? 'Explore →' : 'Next →';
        dotEls.forEach((dot, n) =>
            dot.setAttribute('aria-current', String(n === index)),
        );
        body.scrollTop = 0;
        lesson.setup(stage);
    }

    function setOpen(value: boolean): void {
        if (value === open) return;
        open = value;
        panel.hidden = !open;
        if (open) show(index);
        onChange(open);
    }

    close.addEventListener('click', () => setOpen(false));
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => {
        if (index === LESSONS.length - 1) setOpen(false);
        else show(index + 1);
    });

    return {
        get open() {
            return open;
        },
        panel,
        toggle() {
            setOpen(!open);
        },
        close() {
            setOpen(false);
        },
    };
}
