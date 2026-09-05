import styles from './StatusPill.module.css';

export function StatusPill({ label }: { label: string }) {
  return <span className={styles.pill}>{label}</span>;
}
