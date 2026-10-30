// Freehand drawing: pointer events on the canvas to a closed path in screen space

import type { Point } from '../math/types';

const MIN_POINTS = 10;

export interface Freehand {
    enabled: boolean;
    stroke: Point[];
}

export function createFreehand(
    canvas: HTMLCanvasElement,
    onDone: (stroke: Point[]) => void,
): Freehand {
    const state: Freehand = { enabled: false, stroke: [] };
    let drawing = false;

    const toLocal = (e: PointerEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    canvas.addEventListener('pointerdown', (e) => {
        if (!state.enabled || e.button !== 0) return;
        drawing = true;
        canvas.setPointerCapture(e.pointerId);
        state.stroke = [toLocal(e)];
    });

    const finish = () => {
        if (!drawing) return;
        drawing = false;
        if (state.stroke.length >= MIN_POINTS) onDone(state.stroke);
        state.stroke = [];
    };

    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);

    return state;
}
