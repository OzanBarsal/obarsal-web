import type { MetadataRoute } from 'next';
import { site } from '@/content';

// No `lastModified`: a build-time value would mark every rebuild as a content change.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.meta.url,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
