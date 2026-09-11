import { describe, expect, it } from 'vitest';
import { DASH, LINE_KEYS, MARGIN, dashes, lines, readoutAt, type Targets } from '@/lib/instruments/frame';

const T: Targets = {
  vw: 1440,
  vh: 900,
  header: { x: 0, y: 0, w: 1440, h: 66 },
  head: { x: 80, y: 0, w: 1280, h: 66 },
  h1: { x: 232, y: 176, w: 848, h: 246 },
  body: { x: 232, y: 120, w: 848, h: 600 },
  lede: { x: 232, y: 444, w: 720, h: 94 },
  actions: { x: 232, y: 560, w: 420, h: 48 },
  section: { x: 232, y: 700, w: 848, h: 200 },
  sectionBody: { x: 288, y: 764, w: 696, h: 136 },
  rail: { x: 175, y: 66, w: 1, h: 834 },
  lead: null,
  copy: [],
};

const byKey = (t: Targets) => new Map(lines(t).map((l) => [l.key, l]));

describe('dashes', () => {
  it('counts one dash per 9px and never fewer than one', () => {
    expect(DASH).toBe(9);
    expect(dashes(0)).toEqual({ n: 1, ms: 120 });
    expect(dashes(9)).toEqual({ n: 1, ms: 120 });
    expect(dashes(243).n).toBe(27);
    expect(dashes(540).n).toBe(60);
  });
  it('clamps the duration to 120ms below 15 dashes and 480ms above 60', () => {
    expect(dashes(9).ms).toBe(120);
    expect(dashes(135).ms).toBe(120);
    expect(dashes(144).ms).toBe(128);
    expect(dashes(243).ms).toBe(216);
    expect(dashes(540).ms).toBe(480);
    expect(dashes(4000).ms).toBe(480);
  });
});

describe('lines', () => {
  it('frames the heading on all four edges, each wiping from its own end', () => {
    const l = byKey(T);
    expect(l.get('h1-left')).toEqual({ key: 'h1-left', rect: { x: 232, y: 176, w: 1, h: 246 }, from: '0 0 100% 0' });
    expect(l.get('h1-top')).toEqual({ key: 'h1-top', rect: { x: 232, y: 176, w: 848, h: 1 }, from: '0 100% 0 0' });
    expect(l.get('h1-right')).toEqual({ key: 'h1-right', rect: { x: 1079, y: 176, w: 1, h: 246 }, from: '0 0 100% 0' });
    expect(l.get('h1-bottom')).toEqual({ key: 'h1-bottom', rect: { x: 232, y: 421, w: 848, h: 1 }, from: '0 0 0 100%' });
  });
  it('rules the fold 24px above the bottom, across the body column', () => {
    expect(byKey(T).get('fold')).toEqual({ key: 'fold', rect: { x: 232, y: 876, w: 848, h: 1 }, from: '0 0 0 100%' });
  });
  it('rounds every edge to a whole pixel, so no line straddles two device rows', () => {
    const f = byKey({ ...T, vh: 900.4, h1: { x: 232.6, y: 176.2, w: 847.5, h: 245.7 } });
    expect(f.get('h1-left')?.rect).toEqual({ x: 233, y: 176, w: 1, h: 246 });
    expect(f.get('h1-top')?.rect).toEqual({ x: 233, y: 176, w: 847, h: 1 });
    expect(f.get('h1-right')?.rect).toEqual({ x: 1079, y: 176, w: 1, h: 246 });
    expect(f.get('h1-bottom')?.rect).toEqual({ x: 233, y: 421, w: 847, h: 1 });
    expect(f.get('fold')?.rect.y).toBe(876);
  });
  it('rounds edges, not sizes: the far lines of a half-pixel box land where its near lines end, and the section box ends on the fold', () => {
    const f = byKey({ ...T, h1: { x: 10.5, y: 20.5, w: 100.5, h: 50.5 }, sectionBody: { x: 288, y: 764.5, w: 696.5, h: 136 } });
    const top = f.get('h1-top')!.rect, left = f.get('h1-left')!.rect;
    expect(f.get('h1-right')!.rect.x).toBe(top.x + top.w - 1);
    expect(f.get('h1-bottom')!.rect.y).toBe(left.y + left.h - 1);
    expect(top).toEqual({ x: 11, y: 21, w: 100, h: 1 });
    const s = f.get('section-left')!.rect, st = f.get('section-top')!.rect;
    expect(s.y + s.h).toBe(876);
    expect(f.get('section-right')!.rect.x).toBe(st.x + st.w - 1);
  });
  it('keeps the fold last so it wipes after the frame', () => {
    expect(lines(T).map((l) => l.key).at(-1)).toBe('fold');
  });
  it('rules beside the rail, 5px left of its line, from under the header seam to the fold', () => {
    expect(byKey(T).get('rail')).toEqual({ key: 'rail', rect: { x: 170, y: 66, w: 1, h: 810 }, from: '0 0 100% 0' });
    expect(byKey({ ...T, rail: null }).has('rail')).toBe(false);
  });
  it("boxes the header's inner row on all four edges, each wiping from its own end, and draws nothing there without the row", () => {
    const l = byKey(T);
    expect(l.get('head-left')).toEqual({ key: 'head-left', rect: { x: 80, y: 0, w: 1, h: 66 }, from: '0 0 100% 0' });
    expect(l.get('head-top')).toEqual({ key: 'head-top', rect: { x: 80, y: 0, w: 1280, h: 1 }, from: '0 100% 0 0' });
    expect(l.get('head-right')).toEqual({ key: 'head-right', rect: { x: 1359, y: 0, w: 1, h: 66 }, from: '0 0 100% 0' });
    expect(l.get('head-bottom')).toEqual({ key: 'head-bottom', rect: { x: 80, y: 65, w: 1280, h: 1 }, from: '0 0 0 100%' });
    expect([...byKey({ ...T, head: null }).keys()].some((k) => k.startsWith('head-'))).toBe(false);
  });
  it('boxes the lede while it clears the fold, and draws nothing there when it runs past the fold or is absent', () => {
    const l = byKey(T);
    expect(l.get('lede-left')?.rect).toEqual({ x: 232, y: 444, w: 1, h: 94 });
    expect(l.get('lede-top')?.rect).toEqual({ x: 232, y: 444, w: 720, h: 1 });
    expect(l.get('lede-right')?.rect).toEqual({ x: 951, y: 444, w: 1, h: 94 });
    expect(l.get('lede-bottom')).toEqual({ key: 'lede-bottom', rect: { x: 232, y: 537, w: 720, h: 1 }, from: '0 0 0 100%' });
    expect(byKey({ ...T, lede: { ...T.lede!, y: 782 } }).has('lede-left')).toBe(true);
    expect(byKey({ ...T, lede: { ...T.lede!, y: 783 } }).has('lede-left')).toBe(false);
    expect(byKey({ ...T, lede: null }).has('lede-top')).toBe(false);
  });
  it("boxes the first section's content on top, left and right down to the fold, only while the section clears the fold by 40px", () => {
    const l = byKey(T);
    expect(l.get('section-top')).toEqual({ key: 'section-top', rect: { x: 288, y: 764, w: 696, h: 1 }, from: '0 100% 0 0' });
    expect(l.get('section-left')).toEqual({ key: 'section-left', rect: { x: 288, y: 764, w: 1, h: 112 }, from: '0 0 100% 0' });
    expect(l.get('section-right')).toEqual({ key: 'section-right', rect: { x: 983, y: 764, w: 1, h: 112 }, from: '0 0 100% 0' });
    expect(lines(T).map((x) => x.key as string)).not.toContain('section-bottom');
    expect(byKey({ ...T, section: { ...T.section!, y: 835 } }).has('section-top')).toBe(true);
    expect(byKey({ ...T, section: { ...T.section!, y: 836 } }).has('section-top')).toBe(false);
    expect(byKey({ ...T, section: null }).has('section-left')).toBe(false);
    expect(byKey({ ...T, sectionBody: null }).has('section-right')).toBe(false);
  });
  it('orders the head box, the rail, the heading box, the lede box, the section box, the fold — every key once', () => {
    expect(lines(T).map((l) => l.key)).toEqual([
      'head-left', 'head-top', 'head-right', 'head-bottom', 'rail',
      'h1-left', 'h1-top', 'h1-right', 'h1-bottom', 'lede-left', 'lede-top', 'lede-right', 'lede-bottom',
      'section-top', 'section-left', 'section-right', 'fold',
    ]);
    expect(lines(T)).toHaveLength(LINE_KEYS.length);
  });
});

describe('readoutAt', () => {
  const size = { w: 40, h: 12 };
  it('sets the width readout above the heading, on its left edge', () => {
    expect(readoutAt('width', size, T)).toEqual({ x: 232, y: 160, w: 40, h: 12 });
  });
  it('sets the height readout above the heading, on its right edge', () => {
    expect(readoutAt('height', size, T)).toEqual({ x: 1040, y: 160, w: 40, h: 12 });
  });
  it('sets the clock a margin in from the top right, below the header', () => {
    expect(MARGIN).toBe(8);
    expect(readoutAt('clock', size, T)).toEqual({ x: 1392, y: 74, w: 40, h: 12 });
  });
});
