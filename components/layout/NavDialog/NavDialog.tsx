import type { NavLink } from '@/content/types';
import { InvokerDialog } from '@/components/layout/InvokerDialog/InvokerDialog';
import { NavPanel } from '@/components/layout/NavPanel/NavPanel';
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
        <NavPanel className={styles.panel} rows={rows} cta={cta} strip={strip} label={navLabel} />
      </div>
    </InvokerDialog>
  );
}
