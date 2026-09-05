// Segments are joined by nothing: the spacing lives inside the strings.
import { Fragment } from 'react';
import type { Rich } from '@/content/types';
import styles from './RichText.module.css';

export function RichText({ content }: { content: Rich }) {
  return (
    <>
      {content.map((segment, i) =>
        typeof segment === 'string' ? (
          <Fragment key={i}>{segment}</Fragment>
        ) : segment.as === 'accent' ? (
          <span key={i} className={styles.accent}>{segment.text}</span>
        ) : segment.as === 'strong' ? (
          <strong key={i} className={styles.strong}>{segment.text}</strong>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
