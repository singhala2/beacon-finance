'use client';

import { useState, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import { CardLibraryModal } from './CardLibraryModal';
import { PlusIcon } from '@/components/ui';
import {
  CARD_META,
  type CardId,
  type LayoutCard,
  type DashboardLayout,
} from '@/lib/dashboard-layout';

type Props = {
  layout: DashboardLayout;
  onLayoutChange: (next: DashboardLayout) => void;
  cardContent: Record<CardId, ReactNode>;
  editing: boolean;
};

export function CardGrid({ layout, onLayoutChange, cardContent, editing }: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.cards.findIndex((c) => c.id === active.id);
    const newIndex = layout.cards.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onLayoutChange({
      ...layout,
      cards: arrayMove(layout.cards, oldIndex, newIndex),
    });
  }

  function handleRemove(id: CardId) {
    onLayoutChange({
      ...layout,
      cards: layout.cards.filter((c) => c.id !== id),
    });
  }

  function handleAdd(id: CardId) {
    if (layout.cards.some((c) => c.id === id)) return;
    onLayoutChange({
      ...layout,
      cards: [...layout.cards, { id, size: CARD_META[id].defaultSize }],
    });
  }

  const cardIds = layout.cards.map((c) => c.id);
  const onDashboard = new Set(cardIds);

  return (
    <>
      {layout.cards.length === 0 ? (
        <EmptyGrid editing={editing} onAdd={() => setLibraryOpen(true)} />
      ) : (
        <DndContext
          id="dashboard-card-grid"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardIds} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {layout.cards.map((card: LayoutCard) => (
                <SortableCard
                  key={card.id}
                  id={card.id}
                  editing={editing}
                  onRemove={() => handleRemove(card.id)}
                >
                  {cardContent[card.id]}
                </SortableCard>
              ))}
              {editing && (
                <button
                  onClick={() => setLibraryOpen(true)}
                  style={{
                    background: 'transparent',
                    border: '1.5px dashed var(--color-line-2)',
                    borderRadius: 'var(--radius-md)',
                    padding: 20,
                    color: 'var(--color-text-muted)',
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    minHeight: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <PlusIcon size={14} color="var(--color-text-muted)" />
                  Add card
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CardLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAdd={handleAdd}
        alreadyOnDashboard={onDashboard}
      />
    </>
  );
}

function EmptyGrid({ editing, onAdd }: { editing: boolean; onAdd: () => void }) {
  return (
    <div
      style={{
        padding: 40,
        background: 'var(--color-bg-2)',
        border: '1px dashed var(--color-line-2)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <div>Your dashboard is empty.</div>
      {editing ? (
        <button
          onClick={onAdd}
          style={{
            marginTop: 12,
            padding: '8px 14px',
            background: 'var(--color-mint)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-mint-ink)',
            fontSize: 13,
            fontWeight: 540,
            cursor: 'pointer',
          }}
        >
          + Add card
        </button>
      ) : (
        <div style={{ marginTop: 4, fontSize: 13 }}>Hit Customize to add cards.</div>
      )}
    </div>
  );
}
