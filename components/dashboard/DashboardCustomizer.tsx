'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Hero, type HeroData } from './Hero';
import { HeroPickerModal } from './HeroPickerModal';
import { CardGrid } from './CardGrid';
import { EditModeBanner } from './EditModeBanner';
import { makeLayoutSaver } from '@/lib/preferences-client';
import {
  DEFAULT_LAYOUT,
  type CardId,
  type DashboardLayout,
  type HeroId,
} from '@/lib/dashboard-layout';

type Props = {
  initialLayout: DashboardLayout;
  cardContent: Record<CardId, ReactNode>;
  heroData: HeroData;
  editing: boolean;
  topSlot?: ReactNode; // rendered between hero and grid (AskBar + Brief)
};

export function DashboardCustomizer({
  initialLayout,
  cardContent,
  heroData,
  editing,
  topSlot,
}: Props) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const save = useMemo(() => makeLayoutSaver(), []);

  function update(next: DashboardLayout) {
    setLayout(next);
    setError(null);
    save(next).catch((err: Error) => setError(err.message));
  }

  function handleHeroPick(id: HeroId) {
    if (id === layout.hero) return;
    update({ ...layout, hero: id });
  }

  function handleReset() {
    update(DEFAULT_LAYOUT);
  }

  return (
    <>
      {editing && <EditModeBanner onReset={handleReset} />}

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 8,
            padding: '8px 12px',
            background: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-danger) 35%, transparent)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: 'var(--color-text)',
          }}
        >
          Could not save layout: {error}
        </div>
      )}

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Hero
          variant={layout.hero}
          data={heroData}
          editing={editing}
          onClick={() => setPickerOpen(true)}
        />
      </div>

      {topSlot}

      <CardGrid
        layout={layout}
        onLayoutChange={update}
        cardContent={cardContent}
        editing={editing}
      />

      <HeroPickerModal
        open={pickerOpen}
        current={layout.hero}
        data={heroData}
        onClose={() => setPickerOpen(false)}
        onPick={handleHeroPick}
      />
    </>
  );
}
