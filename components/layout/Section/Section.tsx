import type { ReactNode } from 'react';
import type { SectionMeta } from '@/content/types';
import { RailSegment } from '@/components/layout/RailSegment/RailSegment';
import styles from './Section.module.css';

export function Section({ meta, children }: { meta: SectionMeta; children: ReactNode }) {
  const headingId = `section-${meta.index}`;
  return (
    <section id={meta.id} className={styles.row} aria-labelledby={headingId}>
      <RailSegment index={meta.index} />
      <div className={styles.body}>
        <h2 id={headingId} className={styles.label}>{meta.label}</h2>
        {children}
      </div>
    </section>
  );
}
