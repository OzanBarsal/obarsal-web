// An `<a>`, not a `<button>`: every action on this page navigates.
import type { Action } from '@/content/types';
import styles from './Button.module.css';

export function Button({ action }: { action: Action }) {
  const className = action.variant === 'ghost' ? `${styles.btn} ${styles.ghost}` : styles.btn;
  return <a className={className} href={action.href}>{action.label}</a>;
}
