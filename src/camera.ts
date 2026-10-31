// Pan and zoom over the drawing (the grid behind stays put). Drag to pan, wheel or pinch to zoom, double-click or double-tap resets

import type { Point } from './math/types';
import type { Viewport } from './views/viewport';

// How far past the content you can drag, as a fraction of the screen
const PAN_SLACK = 0.35;
const WHEEL_SPEED = 0.0015;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
const TAP_MOVE_PX = 8;

export interface Camera {
    readonly zoom: number;
    apply(view: Viewport): Viewport;
    // A screen x through the camera, for things placed in pixels (the wave graph)
    x(px: number): number;
    setMaxZoom(max: number): void;
    reset(): void;
}

export function createCamera(
    canvas: HTMLCanvasElement,
    canPan: () => boolean,
): Camera {
    let zoom = 1;
    let maxZoom = 1;
    const offset = { x: 0, y: 0 };
    const pointers = new Map<number, Point>();
    // Pinch measured from where it started, not per event: the two fingers report in turn and per-event deltas drift
    let pinch: { dist: number; zoom: number; at: Point } | null = null;
    // A finger left over from a pinch doesn't pan until every finger is up
    let pinched = false;
    let press: (Point & { t: number }) | null = null;
    let lastTap: (Point & { t: number }) | null = null;

    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });
    const centre = () => ({ x: size().w / 2, y: size().h / 2 });

    const local = (e: PointerEvent | WheelEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Zoomed content covers (zoom - 1) extra half-screens each way; slack on top of that
    const clamp = () => {
        zoom = Math.min(Math.max(zoom, 1), maxZoom);
        const { w, h } = size();
        const limX = (w / 2) * (zoom - 1) + w * PAN_SLACK;
        const limY = (h / 2) * (zoom - 1) + h * PAN_SLACK;
        offset.x = Math.min(Math.max(offset.x, -limX), limX);
        offset.y = Math.min(Math.max(offset.y, -limY), limY);
    };

    // Keeps the point under `at` fixed on screen
    const zoomAt = (at: Point, factor: number) => {
        const c = centre();
        const before = zoom;
        zoom = Math.min(Math.max(zoom * factor, 1), maxZoom);
        const k = zoom / before;
        offset.x = at.x - c.x - (at.x - c.x - offset.x) * k;
        offset.y = at.y - c.y - (at.y - c.y - offset.y) * k;
        clamp();
    };

    const spread = () => {
        const [a, b] = [...pointers.values()];
        return {
            mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            dist: Math.hypot(b.x - a.x, b.y - a.y),
        };
    };

    // Screen point → the same point before zoom and offset
    const unzoom = (s: Point): Point => {
        const c = centre();
        return {
            x: c.x + (s.x - c.x - offset.x) / zoom,
            y: c.y + (s.y - c.y - offset.y) / zoom,
        };
    };

    const startPinch = () => {
        const { mid, dist } = spread();
        pinch = { dist, zoom, at: unzoom(mid) };
        pinched = true;
    };

    canvas.addEventListener('pointerdown', (e) => {
        // Left button belongs to freehand while drawing; middle/right always pan
        const allowed = e.button === 1 || e.button === 2 || canPan();
        if (!allowed || pointers.size >= 2) return;
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, local(e));
        press = pointers.size === 1 ? { ...local(e), t: performance.now() } : null;
        if (pointers.size === 2) startPinch();
        canvas.classList.add('grabbing');
    });

    canvas.addEventListener('pointermove', (e) => {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        const p = local(e);
        pointers.set(e.pointerId, p);

        if (pointers.size === 1) {
            if (pinched) return;
            offset.x += p.x - prev.x;
            offset.y += p.y - prev.y;
            clamp();
            return;
        }
        if (!pinch || pinch.dist === 0) return;
        // Keep the point that started under the fingers under them
        const { mid, dist } = spread();
        const c = centre();
        zoom = Math.min(Math.max((pinch.zoom * dist) / pinch.dist, 1), maxZoom);
        offset.x = mid.x - c.x - (pinch.at.x - c.x) * zoom;
        offset.y = mid.y - c.y - (pinch.at.y - c.y) * zoom;
        clamp();
    });

    const release = (e: PointerEvent) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        if (pointers.size > 0) return;
        canvas.classList.remove('grabbing');
        const wasPinch = pinched;
        pinched = false;

        // Touch has no dblclick everywhere, so double-tap is detected here
        if (e.type !== 'pointerup' || e.pointerType === 'mouse' || wasPinch || !press) return;
        const at = local(e);
        const now = performance.now();
        if (Math.hypot(at.x - press.x, at.y - press.y) > TAP_MOVE_PX) return;
        if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(at.x - lastTap.x, at.y - lastTap.y) < DOUBLE_TAP_PX) {
            lastTap = null;
            reset();
        } else {
            lastTap = { ...at, t: now };
        }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    // passive: false so preventDefault stops the page (or the site around the iframe) scrolling
    canvas.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            zoomAt(local(e), Math.exp(-e.deltaY * WHEEL_SPEED));
        },
        { passive: false },
    );

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const reset = () => {
        zoom = 1;
        offset.x = 0;
        offset.y = 0;
    };
    canvas.addEventListener('dblclick', () => {
        if (canPan()) reset();
    });

    return {
        get zoom() {
            return zoom;
        },
        apply: (view) => {
            const c = centre();
            return {
                origin: {
                    x: c.x + (view.origin.x - c.x) * zoom + offset.x,
                    y: c.y + (view.origin.y - c.y) * zoom + offset.y,
                },
                scale: view.scale * zoom,
            };
        },
        x: (px) => {
            const c = centre();
            return c.x + (px - c.x) * zoom + offset.x;
        },
        setMaxZoom: (max) => {
            maxZoom = Math.max(1, max);
            clamp();
        },
        reset,
    };
}
