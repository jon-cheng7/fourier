// Split view guides: vertical line from the x chain, horizontal from the y chain, meeting at the pen

import type { Point } from '../math/types';

export function drawCrosshair(
    ctx: CanvasRenderingContext2D,
    xTip: Point,
    yTip: Point,
): void {
    const pen = { x: xTip.x, y: yTip.y };

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(xTip.x, xTip.y);
    ctx.lineTo(pen.x, pen.y);
    ctx.moveTo(yTip.x, yTip.y);
    ctx.lineTo(pen.x, pen.y);
    ctx.stroke();

    ctx.fillStyle = '#c5fb45';
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 3, 0, Math.PI * 2);
    ctx.fill();
}
