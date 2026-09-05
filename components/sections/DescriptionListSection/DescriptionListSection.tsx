import type { DescriptionGroup, SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import styles from './DescriptionListSection.module.css';

export function DescriptionListSection({
  section,
  groups,
}: {
  section: SectionMeta;
  groups: readonly DescriptionGroup[];
}) {
  return (
    <Section meta={section}>
      <dl className={styles.groups}>
        {groups.map((group) => (
          <div key={group.heading} className={styles.group}>
            <dt className={styles.heading}>{group.heading}</dt>
            <dd className={styles.items}>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
