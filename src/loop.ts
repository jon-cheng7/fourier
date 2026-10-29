// rAF loop. onFrame gets dt in seconds.

// Caps dt so returning to a hidden tab doesn't jump
const MAX_DT = 0.05;

export interface Loop {
  start(): void;
  stop(): void;
}

export function createLoop(onFrame: (dt: number) => void): Loop {
  let last: number | null = null;
  let rafId = 0;

  const frame = (now: number) => {
    const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_DT);
    last = now;
    onFrame(dt);
    rafId = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (rafId) return;
      last = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
  };
}
