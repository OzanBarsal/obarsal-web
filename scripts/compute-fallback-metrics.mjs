#!/usr/bin/env node
// Recomputes the `*-Fallback` @font-face descriptors in app/styles/fonts.css.
// Metrics come from @capsizecss/metrics by family name, not from the subset
// files: ascent/descent/lineGap/unitsPerEm are constant across a family.
// Usage:  node scripts/compute-fallback-metrics.mjs

import { createFontStack } from '@capsizecss/core';
import spaceGrotesk from '@capsizecss/metrics/spaceGrotesk';
import jetBrainsMono from '@capsizecss/metrics/jetBrainsMono';
import arial from '@capsizecss/metrics/arial';
import courierNew from '@capsizecss/metrics/courierNew';

const sans = createFontStack([spaceGrotesk, arial], { fontFaceFormat: 'styleString' });
const mono = createFontStack([jetBrainsMono, courierNew], { fontFaceFormat: 'styleString' });

console.log('=== Space Grotesk vs Arial (--font-sans) ===');
console.log(sans.fontFamily);
console.log(sans.fontFaces);
console.log();
console.log('=== JetBrains Mono vs Courier New (--font-mono) ===');
console.log(mono.fontFamily);
console.log(mono.fontFaces);
