// Off-screen rather than `display: none` or `visibility: hidden`: both take it
// out of the tab order. It returns on `:focus`, not `:focus-visible`.
import styles from './SkipLink.module.css';

const MAIN = '#main';

export function SkipLink({ label }: { label: string }) {
  return (
    <a href={MAIN} className={styles.skip}>
      {label}
    </a>
  );
}
