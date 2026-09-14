#!/usr/bin/env bash
# Every source-only check from CLAUDE.md, with its expected value. Exit 1 on any drift.
set -u
cd "$(dirname "$0")/.."
fail=0
check() { # name, expected, actual
  if [ "$2" != "$3" ]; then printf 'FAIL %s\n  expected: %s\n  actual:   %s\n' "$1" "$2" "$3"; fail=1; fi
}
SRC='app components content lib scripts tests tools'
src() { find "$@" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.mjs' \); }

check "components import no content" "" "$(grep -rnE "/content(/index)?'" components/ || true)"
check "folders at five or more files" "$(printf '5 lib/field\n8 app')" \
  "$(find $SRC -type d | while read -r d; do n=$(find "$d" -maxdepth 1 -type f | wc -l); [ "$n" -ge 5 ] && echo "$n $d"; done | sort)"
check "files over 150 lines" "" \
  "$(src $SRC | xargs wc -l | awk '$1>150 && $2!="total"')"
check "component folder layout" "" \
  "$(find components -type f | awk -F/ 'NF!=4 || ($NF != $(NF-1)".tsx" && $NF != $(NF-1)".module.css")')"
check "cross-imported css modules" "components/sections/TileGridSection/TileGridSection.tsx:3:import prose from '../ProseSection/ProseSection.module.css';" \
  "$(grep -rn "\.\./.*module\.css" components/ || true)"
check "content folder" "$(printf 'index.ts\nsite.json\ntypes.ts')" "$(ls content)"
check "content/index.ts has no validation" "0" "$(grep -c "validate\|throw\|console" content/index.ts)"
check "no content validators" "" "$(grep -rn "length !==\|includes('\[')\|ContentError" content/ || true)"
check "as/variant stay string" "2" "$(grep -c "as: string\|variant: string" content/types.ts)"
check "no tuples in types" "0" "$(grep -c "\[string, string\]" content/types.ts)"
check "component names carry no copy" "" "$(find components -name '*.tsx' | grep -iE 'about|client|skill|process|work|availability|metric' || true)"
check "type names carry no copy" "" "$(grep -nE "(interface|type) (WorkCard|SkillGroup|Metric)\b" content/types.ts || true)"
check "div count" "18" "$(grep -rho '<div' components | wc -l)"
check "span count" "6" "$(grep -rho '<span' components | wc -l)"
check "RichText spans" "1" "$(grep -c "<span" components/ui/RichText/RichText.tsx)"
check "no i/em/b elements" "" "$(grep -rnE "<(i|em|b)[ >]" components/ || true)"
check "aria-hidden sites" "3" "$(grep -rn 'aria-hidden=' components/ | wc -l)"
check "client components" "$(printf 'components/layout/FieldCanvas/FieldCanvas.tsx\ncomponents/layout/InstrumentOverlay/InstrumentOverlay.tsx\ncomponents/layout/InvokerDialog/InvokerDialog.tsx\ncomponents/layout/RailSegment/RailSegment.tsx')" \
  "$(grep -rlE "['\"]use client['\"]" components app lib | sort)"
check "positioned or negative-margin rules" "4" \
  "$(grep -rnE "position: (absolute|fixed)|margin[a-z-]*:[^;]*-[0-9]" app components --include='*.css' | wc -l)"
check "no comment names a task or a document" "" \
  "$(grep -rnE "Task [0-9]+|Phase [0-9]+|brief|plan|artboard|report\.md|design folder" $SRC --exclude=check-rules.sh || true)"

BLOCKS='{ if (b) { n++; if ($0 ~ /\*\//) b=0 } else if ($0 ~ /^[[:space:]]*(\/\/|\{?\/\*)/) { n++; if ($0 ~ /\/\*/ && $0 !~ /\*\//) b=1 } else n=0; if (n>max) { print FILENAME": line "NR; exit } }'
check "comment blocks over four lines" "" \
  "$(src app components content lib tests tools | while read -r f; do awk -v max=4 "${BLOCKS:?}" "$f"; done)"
check "script comment blocks over twelve lines" "" "$(find scripts -type f | while read -r f; do awk -v max=12 "${BLOCKS:?}" "$f"; done)"

POINTERS='lib/og/OgCard.tsx:12 lib/jsonLd.ts:3 lib/ogFonts.ts:1 playwright.config.ts:5
components/ui/StatStrip/StatStrip.module.css:12
components/sections/DescriptionListSection/DescriptionListSection.module.css:40
lib/invokers.d.ts:1 tools/stylelint/focus-visible-twin.mjs:23 lib/field/terrain.ts:3
lib/field/gl/shaders.ts:25 components/layout/FieldCanvas/FieldCanvas.tsx:5'
check "calibration comments still at their lines" "" \
  "$(for p in $POINTERS; do sed -n "${p##*:}p" "${p%%:*}" | grep -qE '^[[:space:]]*(//|/\*)' || echo "stale pointer: $p"; done)"
check "HANDOFF.md under 120 lines" "" \
  "$([ -f docs/superpowers/HANDOFF.md ] && awk 'END { if (NR > 120) print NR " lines" }' docs/superpowers/HANDOFF.md)"
check "no confidentiality guards" "" \
  "$(git grep -n -i "confidential\|denylist\|deny list" -- $SRC .github README.md ":!scripts/check-rules.sh" ":!content/site.json" || true)"
COUNTS='tests/e2e/drawer/motion.spec.ts:7
tests/e2e/drawer/no-js.spec.ts:2
tests/e2e/drawer/static.spec.ts:3
tests/e2e/field/static.spec.ts:1
tests/e2e/opening/gates.spec.ts:1
tests/e2e/page/hero.spec.ts:1
tests/e2e/page/semantics.spec.ts:6
tests/e2e/page/work.spec.ts:1
tests/e2e/presentation/a11y.spec.ts:1
tests/unit/focus-visible-twin.test.ts:1
tests/unit/instruments/layout.test.ts:2
tests/unit/instruments/place.test.ts:1'
check "literal counts in tests, structural facts only" "$COUNTS" \
  "$(grep -rcE "toHaveCount\([0-9]+\)|toHaveLength\([0-9]+\)" tests/ | grep -v ':0$' | sort)"

[ "$fail" = 0 ] && echo "check-rules: OK"
exit $fail
