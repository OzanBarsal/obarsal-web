import type { NavLink, SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import styles from './Contact.module.css';

export function Contact({
  section,
  email,
  socials,
  socialsLabel,
  footerNote,
  copyrightName,
}: {
  section: SectionMeta;
  email: string;
  socials: readonly NavLink[];
  socialsLabel: string;
  footerNote: string;
  copyrightName: string;
}) {
  const year = new Date().getFullYear();
  const copyrightText = `© ${year} ${copyrightName}`;
  return (
    <Section meta={section}>
      <address className={styles.address}>
        <a className={styles.mail} href={`mailto:${email}`}>{email}</a>
        <ul className={styles.socials} aria-label={socialsLabel}>
          {socials.map((s) => (
            <li key={s.href}><a href={s.href} rel="me">{s.label}</a></li>
          ))}
        </ul>
      </address>
      {/* A <footer> inside a <section> exposes no contentinfo landmark; the role restores it. */}
      <footer className={styles.foot} role="contentinfo">
        <p>{copyrightText}</p>
        <p>{footerNote}</p>
      </footer>
    </Section>
  );
}
