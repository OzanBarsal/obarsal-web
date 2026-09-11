import { afterEach, describe, expect, it, vi } from 'vitest';
import { gate, openingGateScript } from './gate';

type Stub = {
  reduced?: boolean;
  visibility?: string;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function install(stub: Stub) {
  const dataset: Record<string, string> = {};
  vi.stubGlobal('matchMedia', () => ({ matches: stub.reduced ?? false }));
  vi.stubGlobal('document', {
    visibilityState: stub.visibility ?? 'visible',
    documentElement: { dataset },
  });
  vi.stubGlobal('navigator', stub.connection ? { connection: stub.connection } : {});
  return dataset;
}

afterEach(() => vi.unstubAllGlobals());

describe('gate', () => {
  it('passes on a visible, motion-allowing, unmetered load: sets playing', () => {
    const dataset = install({});
    gate();
    expect(dataset.opening).toBe('playing');
  });

  it('plays on every load: storage is never read or written', () => {
    const dataset = install({});
    const storage = { getItem: vi.fn(() => '1'), setItem: vi.fn() };
    vi.stubGlobal('sessionStorage', storage);
    gate();
    expect(dataset.opening).toBe('playing');
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each<[string, Stub]>([
    ['reduced motion is on', { reduced: true }],
    ['the tab is hidden', { visibility: 'hidden' }],
    ['the connection is metered', { connection: { saveData: true } }],
    ['the connection is 2g', { connection: { effectiveType: '2g' } }],
    ['the connection is slow-2g', { connection: { effectiveType: 'slow-2g' } }],
  ])('skips when %s: no attribute', (_name, stub) => {
    const dataset = install(stub);
    gate();
    expect(dataset.opening).toBeUndefined();
  });

  it('lets a 4g connection through', () => {
    const dataset = install({ connection: { effectiveType: '4g' } });
    gate();
    expect(dataset.opening).toBe('playing');
  });
});

describe('openingGateScript', () => {
  it('is a self-invoking script that parses', () => {
    expect(() => new Function(openingGateScript)).not.toThrow();
    expect(openingGateScript.startsWith('(')).toBe(true);
    expect(openingGateScript.endsWith(')()')).toBe(true);
    expect(openingGateScript).not.toContain('</');
  });
});
