'use client';

import { useEffect, useRef } from 'react';
import { BEATS, beatAt, countUp, type Beat } from '@/lib/opening/beats';
import styles from './InstrumentOverlay.module.css';

const ABORT_EVENTS = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;

const pad = (n: number) => String(Math.round(n)).padStart(4, '0');

export function InstrumentOverlay() {
  const root = useRef<HTMLDivElement>(null);
  const readLeft = useRef<HTMLSpanElement>(null);
  const readRight = useRef<HTMLSpanElement>(null);
  const chipA = useRef<HTMLSpanElement>(null);
  const chipB = useRef<HTMLSpanElement>(null);
  const chipC = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    if (html.dataset.opening !== 'playing' || !el) return;
    const row = el.parentElement;
    const h1 = row?.querySelector('h1');
    if (!row || !h1 || !readLeft.current || !readRight.current || !chipA.current || !chipB.current || !chipC.current) {
      html.dataset.opening = 'done';
      return;
    }

    const paint = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
    const t0 = paint ? paint.startTime : performance.now();
    const from = Number.parseFloat(getComputedStyle(el).paddingLeft);
    const to = el.getBoundingClientRect().width;
    const columns = getComputedStyle(row).gridTemplateColumns;
    readLeft.current.textContent = pad(from);
    readRight.current.textContent = pad(Number.parseFloat(columns));
    chipA.current.textContent = `font-size: ${getComputedStyle(h1).fontSize}`;
    chipB.current.textContent = `--accent: ${getComputedStyle(html).getPropertyValue('--accent').trim()}`;
    chipC.current.textContent = `grid: ${columns}`;

    let raf = 0;
    let beat: Beat | -1 = -1;
    let shown = '';
    const stop = () => {
      cancelAnimationFrame(raf);
      for (const type of ABORT_EVENTS) window.removeEventListener(type, abort);
      document.removeEventListener('visibilitychange', onHidden);
    };
    const finish = () => { stop(); html.dataset.opening = 'done'; };
    const abort = () => { el.classList.add(styles.cut!); finish(); };
    const onHidden = () => { if (document.hidden) abort(); };
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const elapsed = now - t0;
      const next = beatAt(elapsed);
      if (next !== beat) { beat = next; el.dataset.beat = String(next); }
      if (elapsed >= BEATS[1]) {
        const text = pad(countUp(from, to, elapsed));
        if (text !== shown) { shown = text; readLeft.current!.textContent = text; }
      }
      if (next === 3) finish();
    };
    for (const type of ABORT_EVENTS) window.addEventListener(type, abort, { once: true, passive: true });
    document.addEventListener('visibilitychange', onHidden);
    raf = requestAnimationFrame(step);
    return () => {
      stop();
      // A real unmount detaches the node in the mutation pass, before this passive cleanup runs;
      // the development double-invoke leaves it attached.
      if (!el.isConnected) html.dataset.opening = 'done';
    };
  }, []);

  return (
    <div ref={root} className={styles.overlay} aria-hidden="true">
      <div className={styles.left} />
      <div className={styles.right} />
      <div className={styles.ruleA} />
      <div className={styles.ruleB} />
      <span ref={readLeft} className={styles.readLeft} />
      <span ref={readRight} className={styles.readRight} />
      <span ref={chipA} className={styles.chipA} />
      <span ref={chipB} className={styles.chipB} />
      <span ref={chipC} className={styles.chipC} />
    </div>
  );
}
