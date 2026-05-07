'use client';

import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  id: string;
  editing: boolean;
  onRemove: () => void;
  children: ReactNode;
};

export function SortableCard({ id, editing, onRemove, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    opacity: isDragging ? 0.5 : 1,
    cursor: editing ? 'grab' : 'default',
    height: '100%',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(editing ? listeners : {})}>
      {children}
      {editing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Remove card"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: 'var(--color-bg-3)',
            border: '1px solid var(--color-line-2)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
            zIndex: 2,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
