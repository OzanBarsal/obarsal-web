import styles from './Tag.module.css';

export function Tag({ label }: { label: string }) {
  return <li className={styles.tag}>{label}</li>;
}

export function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <ul className={styles.tags}>
      {tags.map((t) => <Tag key={t} label={t} />)}
    </ul>
  );
}
