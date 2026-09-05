import type { Rich, SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import { RichText } from '@/components/ui/RichText/RichText';
import styles from './ProseSection.module.css';

export function ProseSection({
  section,
  statement,
  paragraphs,
}: {
  section: SectionMeta;
  statement?: string;
  paragraphs: readonly Rich[];
}) {
  return (
    <Section meta={section}>
      {statement && <p className={styles.statement}>{statement}</p>}
      {paragraphs.map((p, i) => (
        <p key={i} className={styles.p}>
          <RichText content={p} />
        </p>
      ))}
    </Section>
  );
}
