// An `<a>`, not a `<button>`: every action on this page navigates.
import type { Action } from '@/content/types';
import styles from './Button.module.css';

export function Button({ action, className }: { action: Action; className?: string }) {
  const classes = [styles.btn, action.variant === 'ghost' && styles.ghost, className]
    .filter(Boolean)
    .join(' ');
  return <a className={classes} href={action.href}>{action.label}</a>;
}
