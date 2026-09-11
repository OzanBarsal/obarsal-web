import { site } from '@/content';

// JSON.stringify does not escape `<`, so a string containing "</script>" would
// close the JSON-LD script element early. `\u003c` is inert inside a JSON string.
export function escapeForJsonLdScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export function personJsonLd(): string {
  const lead = site.skills.groups[0];
  if (!lead) throw new Error('skills carries no group for knowsAbout');
  const knowsAbout = lead.items;
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.meta.name,
    jobTitle: site.meta.jobTitle,
    url: site.meta.url,
    email: `mailto:${site.meta.email}`,
    sameAs: [...site.meta.sameAs],
    knowsAbout,
  };
  return escapeForJsonLdScript(JSON.stringify(payload));
}
