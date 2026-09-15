export type Segment = string | { readonly text: string; readonly as: string };

export type Rich = readonly Segment[];

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export interface Action {
  readonly label: string;
  readonly href: string;
  readonly variant: string;
}

export interface Stat {
  readonly value: string;
  readonly label: string;
}

export interface CardContent {
  readonly id: string;
  readonly meta: readonly string[];
  readonly title: string;
  readonly facts: readonly string[];
  readonly outcome: string;
  readonly metrics?: readonly Stat[];
  readonly tags: readonly string[];
}

export interface Logo {
  readonly name: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export interface DescriptionGroup {
  readonly heading: string;
  readonly items: readonly string[];
}

export interface SectionMeta {
  /** Zero-padded ordinal, e.g. "03". */
  readonly index: string;
  readonly label: string;
  readonly id?: string;
}

export interface SiteContent {
  readonly meta: {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly url: string;
    readonly email: string;
    readonly jobTitle: string;
    readonly sameAs: readonly string[];
  };
  readonly header: {
    readonly skipToContent: string;
    readonly navLabel: string;
    readonly wordmark: { readonly name: string; readonly suffix: string };
    readonly links: readonly NavLink[];
    readonly availability: { readonly show: boolean; readonly label: string };
    readonly cta: NavLink;
    readonly menu: { readonly open: string; readonly close: string };
  };
  readonly hero: {
    readonly index: string;
    readonly eyebrow: string;
    readonly headline: Rich;
    readonly lede: string;
    readonly actions: readonly Action[];
    readonly strip: readonly string[];
  };
  readonly process: {
    readonly section: SectionMeta;
    readonly statement: string;
    readonly paragraphs: readonly Rich[];
  };
  readonly work: { readonly section: SectionMeta; readonly cards: readonly CardContent[] };
  readonly clients: {
    readonly section: SectionMeta;
    readonly lede: string;
    readonly pauseLabel: string;
    readonly logos: readonly Logo[];
  };
  readonly about: { readonly section: SectionMeta; readonly paragraphs: readonly Rich[] };
  readonly skills: { readonly section: SectionMeta; readonly groups: readonly DescriptionGroup[] };
  readonly contact: {
    readonly section: SectionMeta;
    readonly email: string;
    readonly socials: readonly NavLink[];
    readonly socialsLabel: string;
    readonly footerNote: string;
    readonly copyrightName: string;
  };
}
