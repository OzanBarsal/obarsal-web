import type { Action, Rich } from '@/content/types';
import { RichText } from '@/components/ui/RichText/RichText';
import { Button } from '@/components/ui/Button/Button';
import { RailSegment } from '@/components/layout/RailSegment/RailSegment';
import styles from './Hero.module.css';

export function Hero({
  index,
  eyebrow,
  headline,
  lede,
  actions,
  strip,
}: {
  index: string;
  eyebrow: string;
  headline: Rich;
  lede: string;
  actions: readonly Action[];
  strip: readonly string[];
}) {
  return (
    <div className={styles.hero} id="top">
      <div className={styles.row}>
        <RailSegment index={index} first />
        <div className={styles.body}>
          <hgroup>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.headline}><RichText content={headline} /></h1>
            <p className={styles.lede}>{lede}</p>
          </hgroup>
          <div className={styles.actions}>
            {actions.map((a) => <Button key={a.href} action={a} />)}
          </div>
          <ul className={styles.strip}>
            {strip.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
