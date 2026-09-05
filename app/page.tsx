import { site } from '@/content';
import { Header } from '@/components/layout/Header/Header';
import { Hero } from '@/components/sections/Hero/Hero';
import { ProseSection } from '@/components/sections/ProseSection/ProseSection';
import { CardListSection } from '@/components/sections/CardListSection/CardListSection';
import { TileGridSection } from '@/components/sections/TileGridSection/TileGridSection';
import { DescriptionListSection } from '@/components/sections/DescriptionListSection/DescriptionListSection';
import { Contact } from '@/components/sections/Contact/Contact';

export const dynamic = 'force-static';

export default function Page() {
  const { header, hero, process, work, clients, about, skills, contact } = site;
  return (
    <>
      <Header
        wordmark={header.wordmark}
        links={header.links}
        navLabel={header.navLabel}
        status={header.availability}
        cta={header.cta}
      />
      {/* A fragment link moves the scroll, not the focus, unless its target can hold focus. */}
      <main id="main" tabIndex={-1}>
        <Hero
          index={hero.index}
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          lede={hero.lede}
          actions={hero.actions}
          strip={hero.strip}
        />
        <ProseSection
          section={process.section}
          statement={process.statement}
          paragraphs={process.paragraphs}
        />
        <CardListSection section={work.section} cards={work.cards} />
        <TileGridSection section={clients.section} lede={clients.lede} tiles={clients.names} />
        <ProseSection section={about.section} paragraphs={about.paragraphs} />
        <DescriptionListSection section={skills.section} groups={skills.groups} />
        <Contact
          section={contact.section}
          email={contact.email}
          socials={contact.socials}
          socialsLabel={contact.socialsLabel}
          footerNote={contact.footerNote}
          copyrightName={contact.copyrightName}
        />
      </main>
    </>
  );
}
