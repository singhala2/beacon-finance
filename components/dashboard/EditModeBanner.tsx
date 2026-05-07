'use client';

import { SparkleIcon } from '@/components/ui';

type Props = {
  onReset?: () => void;
};

export function EditModeBanner({ onReset }: Props) {
  return (
    <div
      style={{
        background: 'color-mix(in oklab, var(--color-mint) 8%, var(--color-bg-1))',
        border: '1px solid color-mix(in oklab, var(--color-mint) 30%, transparent)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <SparkleIcon size={13} color="var(--color-mint)" />
      <div style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>
        <span style={{ fontWeight: 540 }}>Editing your home.</span>
        <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>
          Drag to reorder, hit × to remove, or add a new card. Hit Done when finished.
        </span>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-line-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 10px',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Reset to default
        </button>
      )}
    </div>
  );
}
