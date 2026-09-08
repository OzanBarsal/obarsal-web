'use client';

import { useEffect, useRef } from 'react';

// The renderer is imported only after hydration and an idle callback, so first paint, hydration and
// the first frame never share a task; Safari has no requestIdleCallback, hence the timeout.
export function FieldCanvas({ className }: { className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!('WebGL2RenderingContext' in window)) { canvas.dataset.state = 'off'; return; }
    let handle: { dispose(): void } | undefined;
    let cancelled = false;
    const start = () => {
      import('@/lib/field/gl/renderer')
        .then((m) => { if (!cancelled) handle = m.mount(canvas); })
        .catch((error: unknown) => { canvas.dataset.state = 'off'; throw error; });
    };
    const idle = typeof window.requestIdleCallback === 'function'
      ? { id: window.requestIdleCallback(start, { timeout: 2000 }), cancel: window.cancelIdleCallback }
      : { id: window.setTimeout(start, 200), cancel: window.clearTimeout };
    return () => { cancelled = true; idle.cancel(idle.id); handle?.dispose(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" data-state="idle" />;
}
