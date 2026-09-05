import type { NavLink } from '@/content/types';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import styles from './Header.module.css';

export function Header({
  wordmark,
  links,
  navLabel,
  status,
  cta,
}: {
  wordmark: { readonly name: string; readonly suffix: string };
  links: readonly NavLink[];
  navLabel: string;
  status: { readonly show: boolean; readonly label: string };
  cta: NavLink;
}) {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <a className={styles.wordmark} href="#top">
          {wordmark.name}
          <span className={styles.wordmarkSuffix}>{wordmark.suffix}</span>
        </a>
        <nav className={styles.links} aria-label={navLabel}>
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          {status.show && <StatusPill label={status.label} />}
          <a className={styles.cta} href={cta.href}>
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}
