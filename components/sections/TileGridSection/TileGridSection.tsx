import type { SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import prose from '../ProseSection/ProseSection.module.css';
import styles from './TileGridSection.module.css';

export function TileGridSection({
  section,
  lede,
  tiles,
}: {
  section: SectionMeta;
  lede: string;
  tiles: readonly string[];
}) {
  return (
    <Section meta={section}>
      <p className={prose.p}>{lede}</p>
      <ul className={`${styles.wall} ${styles.list}`}>
        {tiles.map((tile) => <li key={tile}>{tile}</li>)}
      </ul>
    </Section>
  );
}
