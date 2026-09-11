import { describe, expect, it } from 'vitest';

import { site } from '@/content';
import { escapeForJsonLdScript, personJsonLd } from './jsonLd';

// Tested directly rather than through the page: today's copy contains no `<`.
describe('escapeForJsonLdScript', () => {
  it('escapes an angle bracket that would close the script element', () => {
    const raw = escapeForJsonLdScript(JSON.stringify({ knowsAbout: ['</script><img src=x>'] }));
    expect(raw).not.toContain('<');
    expect(JSON.parse(raw).knowsAbout[0]).toBe('</script><img src=x>');
  });

  it('leaves input with no angle brackets unchanged', () => {
    const json = JSON.stringify({ a: 1, b: 'plain text' });
    expect(escapeForJsonLdScript(json)).toBe(json);
  });
});

describe('personJsonLd', () => {
  it('draws knowsAbout from the first skills group only', () => {
    const data = JSON.parse(personJsonLd());
    expect(data.knowsAbout).toEqual(site.skills.groups[0]!.items);
  });
});
