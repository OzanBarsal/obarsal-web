import { ImageResponse } from 'next/og';
import { site } from '@/content';
import { ACCENT, GROUND } from '@/lib/og/palette';
import { spaceGrotesk600 } from '@/lib/ogFonts';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: GROUND,
          color: ACCENT,
          fontSize: 22,
          fontFamily: 'Space Grotesk',
        }}
      >
        {site.header.wordmark.name.slice(0, 1)}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Space Grotesk', data: spaceGrotesk600, style: 'normal', weight: 600 }],
    },
  );
}
