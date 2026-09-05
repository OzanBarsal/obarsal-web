import type { Stat } from '@/content/types';
import styles from './StatStrip.module.css';

export function StatStrip({ stats }: { stats: readonly Stat[] }) {
  return (
    <dl className={styles.metrics}>
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
