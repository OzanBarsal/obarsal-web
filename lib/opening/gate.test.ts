import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPENING_KEY, gate, openingGateScript } from './gate';

type Stub = {
  stored?: string | null;
  getItemThrows?: boolean;
  setItemThrows?: boolean;
  reduced?: boolean;
  visibility?: string;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function install(stub: Stub) {
  const set = vi.fn(() => {
    if (stub.setItemThrows) throw new Error('quota');
  });
  const dataset: Record<string, string> = {};
  vi.stubGlobal('sessionStorage', {
    getItem: () => {
      if (stub.getItemThrows) throw new Error('refused');
      return stub.stored ?? null;
    },
    setItem: set,
  });
  vi.stubGlobal('matchMedia', () => ({ matches: stub.reduced ?? false }));
  vi.stubGlobal('document', {
    visibilityState: stub.visibility ?? 'visible',
    documentElement: { dataset },
  });
  vi.stubGlobal('navigator', stub.connection ? { connection: stub.connection } : {});
  return { set, dataset };
}

afterEach(() => vi.unstubAllGlobals());

describe('gate', () => {
  it('passes on a clean, visible, motion-allowing, unmetered load: writes the key and sets playing', () => {
    const { set, dataset } = install({});
    gate(OPENING_KEY);
    expect(set).toHaveBeenCalledWith(OPENING_KEY, '1');
    expect(dataset.opening).toBe('playing');
  });

  it.each<[string, Stub]>([
    ['the key is already set', { stored: '1' }],
    ['reduced motion is on', { reduced: true }],
    ['the tab is hidden', { visibility: 'hidden' }],
    ['the connection is metered', { connection: { saveData: true } }],
    ['the connection is 2g', { connection: { effectiveType: '2g' } }],
    ['the connection is slow-2g', { connection: { effectiveType: 'slow-2g' } }],
    ['storage refuses to read', { getItemThrows: true }],
  ])('skips when %s: no key written, no attribute', (_name, stub) => {
    const { set, dataset } = install(stub);
    gate(OPENING_KEY);
    expect(set).not.toHaveBeenCalled();
    expect(dataset.opening).toBeUndefined();
  });

  it('skips when storage refuses to write, leaving no attribute', () => {
    const { dataset } = install({ setItemThrows: true });
    gate(OPENING_KEY);
    expect(dataset.opening).toBeUndefined();
  });

  it('lets a 4g connection through', () => {
    const { dataset } = install({ connection: { effectiveType: '4g' } });
    gate(OPENING_KEY);
    expect(dataset.opening).toBe('playing');
  });
});

describe('openingGateScript', () => {
  it('is a self-invoking script that parses and carries the key', () => {
    expect(() => new Function(openingGateScript)).not.toThrow();
    expect(openingGateScript.startsWith('(')).toBe(true);
    expect(openingGateScript).toContain(JSON.stringify(OPENING_KEY));
    expect(openingGateScript).not.toContain('</');
  });
});
