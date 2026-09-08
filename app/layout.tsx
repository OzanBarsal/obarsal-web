import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { site } from '@/content';
import { personJsonLd } from '@/lib/jsonLd';
import { SkipLink } from '@/components/layout/SkipLink/SkipLink';
import { FieldCanvas } from '@/components/layout/FieldCanvas/FieldCanvas';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/globals.css';
import './styles/field.css';

// Without `metadataBase` Next emits relative Open Graph URLs, which several crawlers do not resolve.
export const metadata: Metadata = {
  metadataBase: new URL(site.meta.url),
  title: site.meta.title,
  description: site.meta.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    url: '/',
    siteName: 'obarsal.dev',
    locale: 'en',
    title: site.meta.title,
    description: site.meta.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.meta.title,
    description: site.meta.description,
  },
};

const DISPLACEMENT_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="gx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="0.16" stop-color="rgb(128,0,0)"/><stop offset="0.84" stop-color="rgb(128,0,0)"/><stop offset="1" stop-color="rgb(255,0,0)"/></linearGradient><linearGradient id="gy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(0,128,0)"/><stop offset="0.16" stop-color="rgb(0,128,0)"/><stop offset="0.84" stop-color="rgb(0,128,0)"/><stop offset="1" stop-color="rgb(0,255,0)"/></linearGradient></defs><rect width="100" height="100" fill="url(#gx)"/><rect width="100" height="100" fill="url(#gy)" style="mix-blend-mode:screen"/></svg>`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <link
        rel="preload"
        href="/fonts/SpaceGrotesk-Variable.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/JetBrainsMono-Variable.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <body>
        <FieldCanvas className="field" />
        <div className="glass" aria-hidden="true" />
        <svg className="filters" aria-hidden="true">
          <filter id="glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={`data:image/svg+xml;utf8,${encodeURIComponent(DISPLACEMENT_MAP)}`} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="70" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {/* A JSON-LD script has no other way to receive content; `personJsonLd()` escapes it. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: personJsonLd() }}
        />
        <SkipLink label={site.header.skipToContent} />
        {children}
      </body>
    </html>
  );
}
