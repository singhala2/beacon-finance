import { z } from 'zod';

export type HeroId = 'networth' | 'cash' | 'investable' | 'debt' | 'cashflow';

export type CardId =
  | 'cashflow'
  | 'spending'
  | 'activity'
  | 'accounts'
  | 'goals'
  | 'investments'
  | 'allocation'
  | 'debt';

export type CardSize = 3 | 4 | 6 | 12;

export type LayoutCard = { id: CardId; size: CardSize };

export type DashboardLayout = {
  hero: HeroId;
  cards: LayoutCard[];
};

export const HERO_IDS: HeroId[] = ['networth', 'cash', 'investable', 'debt', 'cashflow'];

export const CARD_IDS: CardId[] = [
  'cashflow',
  'spending',
  'activity',
  'accounts',
  'goals',
  'investments',
  'allocation',
  'debt',
];

type CardMeta = {
  id: CardId;
  name: string;
  description: string;
  defaultSize: CardSize;
};

export const CARD_META: Record<CardId, CardMeta> = {
  cashflow:    { id: 'cashflow',    name: 'Cash flow',     description: 'Money in vs. out this month, with last-month comparison.', defaultSize: 4 },
  spending:    { id: 'spending',    name: 'Spending',      description: 'Top categories this month vs. last month.',                 defaultSize: 4 },
  activity:    { id: 'activity',    name: 'Recent activity', description: 'The last 5 transactions across every account.',           defaultSize: 6 },
  accounts:    { id: 'accounts',    name: 'Accounts',      description: 'Top accounts by balance.',                                  defaultSize: 6 },
  goals:       { id: 'goals',       name: 'Goals',         description: 'Progress on the goals you set during onboarding.',          defaultSize: 6 },
  investments: { id: 'investments', name: 'Investments',   description: 'Total portfolio value with top holdings.',                  defaultSize: 4 },
  allocation:  { id: 'allocation',  name: 'Allocation',    description: 'Asset-allocation donut: stocks, bonds, cash, crypto.',      defaultSize: 3 },
  debt:        { id: 'debt',        name: 'Debt',          description: 'Total credit balances and which cards carry them.',         defaultSize: 3 },
};

// Cards listed in the prototype that we have not built yet. Library shows
// these as "coming later" so users see what's in the pipeline.
export type ComingCardId = 'subs' | 'paycheck' | 'runway' | 'savings_rate' | 'milestones' | 'scenarios';

export const COMING_CARDS: { id: ComingCardId; name: string; description: string }[] = [
  { id: 'subs',         name: 'Subscriptions',     description: 'Recurring charges Beacon detected.' },
  { id: 'paycheck',     name: 'Next paycheck',     description: 'Countdown plus expected amount.' },
  { id: 'runway',       name: 'Retirement runway', description: 'Years of expenses your assets cover at the current burn.' },
  { id: 'savings_rate', name: 'Savings rate',      description: 'Percentage of income you saved this month.' },
  { id: 'milestones',   name: 'Milestones',        description: 'Your next three dollar milestones.' },
  { id: 'scenarios',    name: 'Scenario compare',  description: 'What-if analyses across goals.' },
];

export type LibrarySection = {
  category: string;
  available: CardId[];
  coming: ComingCardId[];
};

export const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    category: 'Money in / out',
    available: ['cashflow', 'spending', 'activity'],
    coming: ['subs', 'paycheck'],
  },
  {
    category: 'Wealth',
    available: ['accounts', 'investments', 'allocation', 'debt'],
    coming: ['runway', 'savings_rate'],
  },
  {
    category: 'Goals and plan',
    available: ['goals'],
    coming: ['milestones', 'scenarios'],
  },
];

// Default layout matches what the home dashboard rendered before Phase 4.
export const DEFAULT_LAYOUT: DashboardLayout = {
  hero: 'networth',
  cards: [
    { id: 'cashflow', size: 4 },
    { id: 'spending', size: 4 },
    { id: 'investments', size: 4 },
    { id: 'accounts', size: 6 },
    { id: 'goals', size: 6 },
    { id: 'activity', size: 6 },
    { id: 'allocation', size: 3 },
    { id: 'debt', size: 3 },
  ],
};

const HeroIdSchema = z.enum(['networth', 'cash', 'investable', 'debt', 'cashflow']);
const CardIdSchema = z.enum([
  'cashflow',
  'spending',
  'activity',
  'accounts',
  'goals',
  'investments',
  'allocation',
  'debt',
]);
const CardSizeSchema = z.union([z.literal(3), z.literal(4), z.literal(6), z.literal(12)]);

export const LayoutSchema = z.object({
  hero: HeroIdSchema,
  cards: z
    .array(z.object({ id: CardIdSchema, size: CardSizeSchema }))
    .max(20),
});

// Reads a possibly-null/legacy layout off the user record and returns a clean,
// fully-populated layout. Drops unknown card ids silently so a stale layout
// from an older client doesn't crash the dashboard renderer.
export function resolveLayout(stored: unknown): DashboardLayout {
  const parsed = LayoutSchema.safeParse(stored);
  if (!parsed.success) return DEFAULT_LAYOUT;

  // De-dupe card ids — single instance per card id.
  const seen = new Set<CardId>();
  const cards = parsed.data.cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return { hero: parsed.data.hero, cards };
}
