import type { NavLink } from '@/content/types';
import { Button } from '@/components/ui/Button/Button';
import styles from './NavPanel.module.css';

export function NavPanel({
  className,
  rows,
  cta,
  strip,
  label,
}: {
  className?: string;
  rows: readonly { readonly label: string; readonly href: string; readonly index: string }[];
  cta: NavLink;
  strip: readonly string[];
  label: string;
}) {
  const classes = [styles.nav, className].filter(Boolean).join(' ');
  return (
    <nav className={classes} aria-label={label}>
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
  );
}
