'use client';

import { useEffect, useRef } from 'react';
import styles from './RailSegment.module.css';

export function RailSegment({ index, first = false }: { index: string; first?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const tick = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const lastTop = useRef(-1);
  const lastHeight = useRef(-1);
  const lastOn = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = root.current;
    const mark = tick.current;
    const rail = el?.closest('main');
    if (!el || !mark || !rail) return;

    const step = () => {
      frame.current = requestAnimationFrame(step);
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      const markTop = mark.getBoundingClientRect().top + window.scrollY;
      if (first) {
        const start = markTop.toString();
        if (rail.style.getPropertyValue('--rail-start') !== start) rail.style.setProperty('--rail-start', start);
      }
      const mark00 = Number.parseFloat(rail.style.getPropertyValue('--rail-start'));
      if (Number.isNaN(mark00)) return;
      const viewport = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const range = scrollHeight - viewport;
      const target = range > 0 ? mark00 + (window.scrollY * (scrollHeight - mark00)) / range : scrollHeight;
      const tip = (Math.round(target * 100) / 100).toString();
      if (rail.style.getPropertyValue('--rail-tip') !== tip) rail.style.setProperty('--rail-tip', tip);
      const top = rect.top + window.scrollY;
      if (top !== lastTop.current) {
        lastTop.current = top;
        el.style.setProperty('--top', top.toString());
      }
      if (rect.height !== lastHeight.current) {
        lastHeight.current = rect.height;
        el.style.setProperty('--h', rect.height.toString());
      }
      const eased = Number(getComputedStyle(rail).getPropertyValue('--rail-tip'));
      const on = eased >= Math.round(markTop * 100) / 100;
      if (on !== lastOn.current) {
        lastOn.current = on;
        el.classList.toggle(styles.on!, on);
        el.parentElement?.toggleAttribute('data-lit', on);
      }
    };

    frame.current = requestAnimationFrame(step);
    // The transition is enabled one frame after the first write so the fill does not draw in on load.
    requestAnimationFrame(() => requestAnimationFrame(() => rail.classList.add(styles.live!)));
    return () => cancelAnimationFrame(frame.current);
  }, [first]);

  return (
    <div ref={root} className={styles.segment} aria-hidden="true">
      <span className={styles.num}>{index}</span>
      <div className={styles.line}>
        <div className={styles.fill} />
        <div ref={tick} className={styles.tick} />
        <div className={styles.tip} />
      </div>
    </div>
  );
}
