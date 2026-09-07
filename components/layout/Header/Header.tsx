import type { NavLink } from '@/content/types';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { NavDialog } from '@/components/layout/NavDialog/NavDialog';
import styles from './Header.module.css';

export function Header({
  wordmark,
  links,
  rows,
  navLabel,
  status,
  cta,
  menu,
  strip,
}: {
  wordmark: { readonly name: string; readonly suffix: string };
  links: readonly NavLink[];
  rows: readonly { readonly label: string; readonly href: string; readonly index: string }[];
  navLabel: string;
  status: { readonly show: boolean; readonly label: string };
  cta: NavLink;
  menu: { readonly open: string; readonly close: string };
  strip: readonly string[];
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
          <NavDialog id="menu" names={menu} rows={rows} cta={cta} strip={strip} navLabel={navLabel} />
        </nav>
      </div>
    </header>
  );
}
