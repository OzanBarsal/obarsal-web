import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';
import plugin from '../../tools/stylelint/focus-visible-twin.mjs';

const RULE = 'local/focus-visible-twin';

async function lint(code: string): Promise<string[]> {
  const { results } = await stylelint.lint({
    code,
    config: { plugins: [plugin], rules: { [RULE]: true } },
  });
  return results[0]!.warnings.map((w) => w.text);
}

describe(RULE, () => {
  it('reports a :hover rule that has no :focus-visible twin', async () => {
    const warnings = await lint('.x:hover { color: red; }');
    expect(warnings).toEqual([
      `Expected a ":focus-visible" twin of ".x:hover" with the same declarations (${RULE})`,
    ]);
  });

  it('reports a twin that lacks one of the hover declarations', async () => {
    const warnings = await lint(
      '.x:hover { color: red; border-color: blue; } .x:focus-visible { color: red; }',
    );
    expect(warnings).toHaveLength(1);
  });

  it('accepts a twin outside the hover media query that adds its own declarations', async () => {
    const warnings = await lint(
      '@media (hover: hover) { .x:hover { color: red; } } .x:focus-visible { color: red; outline: 2px solid; }',
    );
    expect(warnings).toEqual([]);
  });

  it('rejects a twin written inside the hover media query, where keyboard focus never reaches it', async () => {
    const warnings = await lint(
      '@media (hover: hover) { .x:hover { color: red; } .x:focus-visible { color: red; } }',
    );
    expect(warnings).toEqual([
      `Expected a ":focus-visible" twin of ".x:hover" with the same declarations (${RULE})`,
    ]);
  });

  it('checks every selector of a selector list', async () => {
    const warnings = await lint('.a:hover, .b:hover { color: red; } .a:focus-visible { color: red; }');
    expect(warnings).toEqual([
      `Expected a ":focus-visible" twin of ".b:hover" with the same declarations (${RULE})`,
    ]);
  });
});
