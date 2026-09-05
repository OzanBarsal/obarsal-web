import { site } from '@/content';
import { ACCENT, GROUND, MUTED, TEXT } from './palette';

// Satori lays the children of a flex container out as boxes, never as a run of
// inline text, so one flex item per word is the only way the headline wraps.
const headlineWords = site.hero.headline.flatMap((segment) => {
  const text = typeof segment === 'string' ? segment : segment.text;
  const accent = typeof segment !== 'string' && segment.as === 'accent';
  return text.split(/\s+/).filter(Boolean).map((word) => ({ word, accent }));
});

// Satori needs an explicit `display: 'flex'` on every element with more than one
// child, and takes `letterSpacing` as a number of pixels rather than an em value.
export function OgCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: GROUND,
        padding: '72px 80px',
        borderLeft: `10px solid ${ACCENT}`,
        fontFamily: 'Space Grotesk',
      }}
    >
      {/* Tracking is `.2em` at 12px in the header; .2 x 22 = 4.4px at this size. */}
      <div
        style={{
          display: 'flex',
          fontFamily: 'JetBrains Mono',
          fontSize: 22,
          letterSpacing: 4.4,
          color: TEXT,
        }}
      >
        <span>{site.header.wordmark.name}</span>
        <span style={{ color: MUTED }}>{site.header.wordmark.suffix}</span>
      </div>

      {/* Tracking is `-.042em` at 82px in the design; -.042 x 68 = -2.856px at this size. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 17,
          rowGap: 0,
          fontSize: 68,
          lineHeight: 1.05,
          letterSpacing: -2.856,
          color: TEXT,
          maxWidth: 940,
        }}
      >
        {headlineWords.map(({ word, accent }, i) => (
          <span key={i} style={accent ? { color: ACCENT } : {}}>
            {word}
          </span>
        ))}
      </div>

      {/* Tracking is `.14em` at 11px in the design; .14 x 20 = 2.8px at this size. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          fontFamily: 'JetBrains Mono',
          fontSize: 20,
          letterSpacing: 2.8,
          color: MUTED,
        }}
      >
        {site.hero.strip.map((phrase, i) => (
          <span key={phrase} style={{ display: 'flex', whiteSpace: 'nowrap' }}>
            {phrase}
            {i < site.hero.strip.length - 1 && <span style={{ padding: '0 10px' }}>/</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
