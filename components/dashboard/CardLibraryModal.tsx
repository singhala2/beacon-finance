'use client';

import { useEffect } from 'react';
import { CARD_META, COMING_CARDS, LIBRARY_SECTIONS, type CardId } from '@/lib/dashboard-layout';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (id: CardId) => void;
  alreadyOnDashboard: Set<CardId>;
};

export function CardLibraryModal({ open, onClose, onAdd, alreadyOnDashboard }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 24px',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          background: 'var(--color-bg-1)',
          border: '1px solid var(--color-line-2)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 24px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              Add a card
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-dim)', marginTop: 2 }}>
              Pick what you want to see on your home dashboard.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {LIBRARY_SECTIONS.map((section) => (
          <div key={section.category} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {section.category}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {section.available.map((id) => {
                const meta = CARD_META[id];
                const onDashboard = alreadyOnDashboard.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (onDashboard) return;
                      onAdd(id);
                      onClose();
                    }}
                    disabled={onDashboard}
                    style={{
                      textAlign: 'left',
                      background: onDashboard ? 'var(--color-bg-2)' : 'var(--color-bg-2)',
                      border: '1px solid var(--color-line)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: onDashboard ? 'not-allowed' : 'pointer',
                      opacity: onDashboard ? 0.55 : 1,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (onDashboard) return;
                      e.currentTarget.style.borderColor = 'var(--color-mint)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-line)';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
                        {meta.name}
                      </span>
                      {onDashboard && (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            color: 'var(--color-text-dim)',
                          }}
                        >
                          on dashboard
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {section.coming.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {section.coming.map((cid) => {
                  const meta = COMING_CARDS.find((c) => c.id === cid);
                  if (!meta) return null;
                  return (
                    <div
                      key={cid}
                      style={{
                        background: 'var(--color-bg-2)',
                        border: '1px dashed var(--color-line-2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        opacity: 0.55,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
                          {meta.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            color: 'var(--color-text-dim)',
                          }}
                        >
                          coming later
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                        {meta.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
