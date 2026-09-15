import type { Logo, SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import prose from '../ProseSection/ProseSection.module.css';
import styles from './LogoBandSection.module.css';

export function LogoBandSection({
  section,
  lede,
  pauseLabel,
  logos,
}: {
  section: SectionMeta;
  lede: string;
  pauseLabel: string;
  logos: readonly Logo[];
}) {
  return (
    <Section meta={section}>
      <p className={prose.p}>{lede}</p>
      <div className={styles.band}>
        <ul className={styles.track}>
          {[...logos, ...logos].map((logo, i) => (
            <li key={i} aria-hidden={i >= logos.length || undefined}>
              <img
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
      </div>
      <label className={styles.pause}>
        <input type="checkbox" role="switch" aria-label={pauseLabel} />
      </label>
    </Section>
  );
}
