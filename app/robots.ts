import type { MetadataRoute } from 'next';
import { site } from '@/content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.meta.url}/sitemap.xml`,
  };
}
