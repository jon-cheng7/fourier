// Canvas sized to its container. Drawing is in CSS px; backing store follows DPR.

export interface Stage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export function createStage(container: HTMLElement): Stage {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas not supported");

  const stage: Stage = { canvas, ctx, width: 0, height: 0 };

  // Setting canvas.width clears the canvas and resets ctx state
  const resize = (width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stage.width = width;
    stage.height = height;
  };

  // Fires once on observe
  new ResizeObserver(([entry]) => {
    resize(entry.contentRect.width, entry.contentRect.height);
  }).observe(container);

  // DPR can change without a resize (dragging between monitors)
  const watchDpr = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
      "change",
      () => {
        resize(stage.width, stage.height);
        watchDpr();
      },
      { once: true },
    );
  };
  watchDpr();

  return stage;
}
