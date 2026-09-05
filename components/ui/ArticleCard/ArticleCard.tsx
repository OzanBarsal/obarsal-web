import type { CardContent } from '@/content/types';
import { StatStrip } from '@/components/ui/StatStrip/StatStrip';
import { TagList } from '@/components/ui/Tag/Tag';
import styles from './ArticleCard.module.css';

export function ArticleCard({ card }: { card: CardContent }) {
  return (
    <article className={styles.card}>
      <ul className={styles.meta}>
        {card.meta.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <h3 className={styles.title}>{card.title}</h3>
      <ul className={styles.facts}>
        {card.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className={styles.outcome}>{card.outcome}</p>
      {card.metrics && <StatStrip stats={card.metrics} />}
      <TagList tags={card.tags} />
    </article>
  );
}
