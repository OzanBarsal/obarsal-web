import { ImageResponse } from 'next/og';
import { site } from '@/content';
import { OgCard } from '@/lib/og/OgCard';
import { jetBrainsMono400, spaceGrotesk600 } from '@/lib/ogFonts';

export const alt = `${site.meta.name} — ${site.meta.jobTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<OgCard />, {
    ...size,
    fonts: [
      { name: 'Space Grotesk', data: spaceGrotesk600, style: 'normal', weight: 600 },
      { name: 'JetBrains Mono', data: jetBrainsMono400, style: 'normal', weight: 400 },
    ],
  });
}
