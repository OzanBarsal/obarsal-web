'use client';

import { useEffect, useRef } from 'react';
import { BEATS, COUNT_MS, LAST_BEAT, STAGGER, beatAt, countUp, reached, type Beat } from '@/lib/opening/beats';
import { CHIP_KEYS, GROUP_KEYS, chips } from '@/lib/instruments/chips';
import { LINE_KEYS, READ_KEYS, targets } from '@/lib/instruments/frame';
import { layout } from '@/lib/instruments/layout';
import type { Size } from '@/lib/instruments/place';
import styles from './InstrumentOverlay.module.css';

const ABORT_EVENTS = ['keydown', 'pointerdown', 'wheel', 'touchstart', 'resize'] as const;

const pad = (n: number) => String(Math.round(n)).padStart(4, '0');

export function InstrumentOverlay() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    if (html.dataset.opening !== 'playing' || !el) return;
    let cancelled = false;
    let stop = () => {};
    const end = () => { html.dataset.opening = 'done'; };

    const run = () => {
      if (cancelled) return;
      const t = targets(document, window);
      if (!t || t.h1.y < t.header.y + t.header.h || t.h1.y + t.h1.h > t.vh) { end(); return; }
      const read = new Map(chips(document, window, t).map((c) => [c.key, c]));
      const nodes = new Map<string, HTMLElement>();
      for (const child of el.children) {
        const n = child as HTMLElement;
        n.hidden = false;
        if (n.dataset.k) nodes.set(n.dataset.k, n);
      }
      const width = nodes.get('width');
      const height = nodes.get('height');
      const clock = nodes.get('clock');
      if (!width || !height || !clock) { end(); return; }
      width.textContent = pad(0);
      height.textContent = pad(t.h1.h);
      clock.textContent = 't+0000ms';
      for (const key of CHIP_KEYS) { const n = nodes.get(key); if (n) n.textContent = read.get(key)?.text ?? ''; }
      const sizes = new Map<string, Size>();
      for (const [key, n] of nodes) {
        const r = n.getBoundingClientRect();
        sizes.set(key, { w: r.width, h: r.height });
      }
      const { placed, widthOrder } = layout(t, read, sizes);
      const shown = new Set<string>();
      for (const p of placed) {
        const n = nodes.get(p.key);
        if (!n) continue;
        n.style.setProperty('--x', `${p.rect.x}px`);
        n.style.setProperty('--y', `${p.rect.y}px`);
        n.style.setProperty('--i', String(p.i));
        if (p.line) {
          n.style.setProperty('--w', `${p.rect.w}px`);
          n.style.setProperty('--h', `${p.rect.h}px`);
          n.style.setProperty('--from', p.line.from);
          n.style.setProperty('--n', String(p.line.n));
          n.style.setProperty('--d', `${p.line.ms}ms`);
          n.classList.toggle(styles.v!, p.line.vertical);
        }
        shown.add(p.key);
        el.append(n);
      }
      for (const [key, n] of nodes) if (!shown.has(key)) n.hidden = true;

      const t0 = performance.now();
      const countFrom = widthOrder * STAGGER;
      let raf = 0;
      let beat: Beat | -1 = -1;
      let shownWidth = '';
      let shownClock = '';
      const off = () => {
        cancelAnimationFrame(raf);
        for (const type of ABORT_EVENTS) window.removeEventListener(type, finish);
        document.removeEventListener('visibilitychange', onHidden);
      };
      const finish = () => { off(); end(); };
      const onHidden = () => { if (document.hidden) finish(); };
      const step = (now: number) => {
        raf = requestAnimationFrame(step);
        const elapsed = now - t0;
        const next = beatAt(elapsed);
        if (next !== beat) { beat = next; el.dataset.beat = reached(next); }
        const w = pad(countUp(0, t.h1.w, elapsed, countFrom, countFrom + COUNT_MS));
        if (w !== shownWidth) { shownWidth = w; width.textContent = w; }
        if (elapsed < BEATS[2]) {
          const c = `t+${pad(elapsed)}ms`;
          if (c !== shownClock) { shownClock = c; clock.textContent = c; }
        }
        if (next === LAST_BEAT) finish();
      };
      for (const type of ABORT_EVENTS) window.addEventListener(type, finish, { once: true, passive: true });
      document.addEventListener('visibilitychange', onHidden);
      stop = off;
      raf = requestAnimationFrame(step);
    };

    void document.fonts.ready.then(run);
    return () => {
      cancelled = true;
      stop();
      // A real unmount detaches the node in the mutation pass, before this passive cleanup runs;
      // the development double-invoke leaves it attached.
      if (!el.isConnected) html.dataset.opening = 'done';
    };
  }, []);

  return (
    <div ref={root} className={styles.overlay} aria-hidden="true">
      {LINE_KEYS.map((key) => <div key={key} data-k={key} className={styles.line} />)}
      {GROUP_KEYS.map((g) => <div key={g} data-k={`spine-${g}`} className={styles.line} />)}
      {READ_KEYS.map((key) => <span key={key} data-k={key} className={key === 'clock' ? styles.clock : styles.read} />)}
      {CHIP_KEYS.map((key) => <span key={key} data-k={key} className={styles.chip} />)}
    </div>
  );
}
