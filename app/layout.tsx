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
