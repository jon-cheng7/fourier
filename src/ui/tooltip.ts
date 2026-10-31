// One floating tooltip for the app. Anything with data-tip gets it on hover, keyboard focus, or a tap (touch);
// the canvas calls show/hide itself for circles. Tip text is our own markup, never user input

import type { Point } from '../math/types';

export interface Tooltip {
    show(html: string, at: Point): void;
    hide(): void;
}

export function createTooltip(container: HTMLElement): Tooltip {
    const el = document.createElement('div');
    el.className = 'tooltip';
    el.setAttribute('role', 'tooltip');
    el.hidden = true;
    container.append(el);

    // Beside the pointer, flipped to stay inside the container
    const show = (html: string, at: Point) => {
        el.innerHTML = html;
        el.hidden = false;
        const box = container.getBoundingClientRect();
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let x = at.x + 16;
        let y = at.y + 16;
        if (x + w > box.width - 8) x = at.x - w - 16;
        if (y + h > box.height - 8) y = at.y - h - 16;
        el.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    };
    const hide = () => {
        el.hidden = true;
    };

    const local = (e: PointerEvent): Point => {
        const box = container.getBoundingClientRect();
        return { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const tipOf = (target: EventTarget | null) =>
        target instanceof Element
            ? target.closest<HTMLElement>('[data-tip]')
            : null;

    container.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse') return;
        const t = tipOf(e.target);
        if (t?.dataset.tip) show(t.dataset.tip, local(e));
    });
    container.addEventListener('pointerout', (e) => {
        if (e.pointerType !== 'mouse') return;
        const from = tipOf(e.target);
        if (from && from !== tipOf(e.relatedTarget)) hide();
    });

    // Touch: tap a label to show its tip, tap it again or anywhere else to close.
    // Controls just act, so tapping Pause doesn't pop up an explanation every time
    let tapped: HTMLElement | null = null;
    container.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        const t = tipOf(e.target);
        const control = t?.closest('button, input, select, textarea');
        if (t?.dataset.tip && !control && t !== tapped) {
            show(t.dataset.tip, local(e));
            tapped = t;
        } else if (tapped) {
            hide();
            tapped = null;
        }
    });
    container.addEventListener('focusin', (e) => {
        const t = tipOf(e.target);
        if (!t?.dataset.tip) return;
        const r = t.getBoundingClientRect();
        const box = container.getBoundingClientRect();
        show(t.dataset.tip, { x: r.left - box.left, y: r.bottom - box.top });
    });
    container.addEventListener('focusout', hide);

    return { show, hide };
}
