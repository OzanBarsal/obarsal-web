import type { CardContent, SectionMeta } from '@/content/types';
import { Section } from '@/components/layout/Section/Section';
import { ArticleCard } from '@/components/ui/ArticleCard/ArticleCard';

export function CardListSection({
  section,
  cards,
}: {
  section: SectionMeta;
  cards: readonly CardContent[];
}) {
  return (
    <Section meta={section}>
      {cards.map((card) => <ArticleCard key={card.id} card={card} />)}
    </Section>
  );
}
