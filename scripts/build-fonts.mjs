#!/usr/bin/env node
// Regenerates the self-hosted font files from upstream sources. Not part of the
// app build — run it by hand when a font is upgraded or the subset changes.
//
// Sources: Space Grotesk 2.0.0 and JetBrains Mono 2.304, unzipped under
// ./.font-sources/ (gitignored) or pointed at by SG_VARIABLE_TTF and
// JBM_VARIABLE_TTF.  Run:  node scripts/build-fonts.mjs
//
// Produces the two subset variable woff2 in public/fonts/ (served to browsers)
// and the two static .ttf instances in lib/og/fonts/ (bundled for Satori).
// OFL.txt is not generated: copy it by hand from each upstream release.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'public', 'fonts');
const OG_DIR = path.join(ROOT, 'lib', 'og', 'fonts');

const SG_VARIABLE_TTF =
  process.env.SG_VARIABLE_TTF ??
  path.join(ROOT, '.font-sources', 'sg', 'SpaceGrotesk-2.0.0', 'ttf', 'SpaceGrotesk[wght].ttf');
const JBM_VARIABLE_TTF =
  process.env.JBM_VARIABLE_TTF ??
  path.join(ROOT, '.font-sources', 'jbm', 'fonts', 'variable', 'JetBrainsMono[wght].ttf');

// Google Fonts `latin` + `latin-ext` unicode-range union, taken verbatim
// from the css2 API response for both families (2026-09-02).
const RANGES = [
  [0x0000, 0x00ff], [0x0100, 0x02ba], [0x02bb, 0x02bc], [0x02bd, 0x02c5],
  [0x02c6, 0x02c6], [0x02c7, 0x02cc], [0x02ce, 0x02d7], [0x02da, 0x02da],
  [0x02dc, 0x02dc], [0x02dd, 0x02ff], [0x0304, 0x0304], [0x0308, 0x0308],
  [0x0329, 0x0329], [0x0131, 0x0131], [0x0152, 0x0153],
  [0x1d00, 0x1dbf], [0x1e00, 0x1e9f], [0x1ef2, 0x1eff],
  [0x2000, 0x206f], [0x20a0, 0x20c0], [0x2113, 0x2113], [0x2122, 0x2122],
  [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215],
  [0x2c60, 0x2c7f], [0xa720, 0xa7ff], [0xfeff, 0xfeff], [0xfffd, 0xfffd],
];

const subsetText = RANGES.flatMap(([a, b]) => {
  const out = [];
  for (let c = a; c <= b; c++) out.push(String.fromCodePoint(c));
  return out;
}).join('');

async function build(outDir, name, srcPath, opts) {
  let src;
  try {
    src = await readFile(srcPath);
  } catch (err) {
    throw new Error(
      `Could not read upstream source "${srcPath}" while building ${name}.\n` +
        `See the header of this script for how to obtain and place font sources.\n` +
        `(${err.message})`,
    );
  }
  const buf = await subsetFont(src, subsetText, opts);
  await writeFile(path.join(outDir, name), buf);
  return buf.length;
}

async function main() {
  await mkdir(WEB_DIR, { recursive: true });
  await mkdir(OG_DIR, { recursive: true });

  console.log(`subset character set: ${[...subsetText].length} codepoints`);

  const sizes = {};
  sizes['SpaceGrotesk-Variable.woff2'] = await build(
    WEB_DIR,
    'SpaceGrotesk-Variable.woff2',
    SG_VARIABLE_TTF,
    { targetFormat: 'woff2', variationAxes: { wght: { min: 400, max: 600 } } },
  );
  sizes['JetBrainsMono-Variable.woff2'] = await build(
    WEB_DIR,
    'JetBrainsMono-Variable.woff2',
    JBM_VARIABLE_TTF,
    { targetFormat: 'woff2', variationAxes: { wght: { min: 400, max: 500 } } },
  );
  // Satori cannot read woff2 or variable fonts, so it gets static .ttf instances.
  sizes['SpaceGrotesk-600.ttf'] = await build(
    OG_DIR,
    'SpaceGrotesk-600.ttf',
    SG_VARIABLE_TTF,
    { targetFormat: 'sfnt', variationAxes: { wght: 600 } },
  );
  sizes['JetBrainsMono-400.ttf'] = await build(
    OG_DIR,
    'JetBrainsMono-400.ttf',
    JBM_VARIABLE_TTF,
    { targetFormat: 'sfnt', variationAxes: { wght: 400 } },
  );

  for (const [name, size] of Object.entries(sizes)) {
    console.log(`${String(size).padStart(7)} B  ${(size / 1024).toFixed(1).padStart(6)} KB  ${name}`);
  }
  console.log(`\nWrote ${Object.keys(sizes).length} files to ${path.relative(ROOT, WEB_DIR)}/ and ${path.relative(ROOT, OG_DIR)}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
