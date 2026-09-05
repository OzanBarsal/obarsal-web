import type { ReactNode } from 'react';
import type { SectionMeta } from '@/content/types';
import styles from './Section.module.css';

export function Section({ meta, children }: { meta: SectionMeta; children: ReactNode }) {
  const headingId = `section-${meta.index}`;
  const className = `${styles.row} ${styles.section}`;
  return (
    <section id={meta.id} className={className} aria-labelledby={headingId}>
      <div className={styles.idx} aria-hidden="true">{meta.index}</div>
      <div className={styles.body}>
        <h2 id={headingId} className={styles.label}>{meta.label}</h2>
        {children}
      </div>
    </section>
  );
}
