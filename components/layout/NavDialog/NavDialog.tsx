import type { NavLink } from '@/content/types';
import { Button } from '@/components/ui/Button/Button';
import { InvokerDialog } from '@/components/layout/InvokerDialog/InvokerDialog';
import styles from './NavDialog.module.css';

export function NavDialog({
  id,
  names,
  rows,
  cta,
  strip,
  navLabel,
}: {
  id: string;
  names: { readonly open: string; readonly close: string };
  rows: readonly { readonly label: string; readonly href: string; readonly index: string }[];
  cta: NavLink;
  strip: readonly string[];
  navLabel: string;
}) {
  return (
    <InvokerDialog
      id={id}
      className={styles.dialog}
      toggle={{ className: styles.toggle, label: names.open }}
    >
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.close}
          commandfor={id}
          command="close"
          aria-label={names.close}
        />
      </div>
      <div className={styles.clip}>
        <nav className={styles.panel} aria-label={navLabel}>
          {rows.map((row, i) => (
            <a key={row.href} className={styles.row} href={row.href} data-index={row.index} autoFocus={i === 0}>
              {row.label}
            </a>
          ))}
          <Button action={{ ...cta, variant: 'primary' }} className={styles.cta} />
          <ul className={styles.strip}>
            {strip.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </nav>
      </div>
    </InvokerDialog>
  );
}
