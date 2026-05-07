'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SparkleIcon } from '@/components/ui';

const PLACEHOLDER = 'Ask Beacon anything about your money…';

export function AskBar() {
  const router = useRouter();
  const [val, setVal] = useState('');
  const filled = val.trim().length > 0;

  function submit() {
    if (!filled) return;
    router.push(`/chat?q=${encodeURIComponent(val.trim())}`);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        background: 'var(--color-bg-1)',
        border: `1px solid ${filled ? 'var(--color-indigo)' : 'var(--color-line-2)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px 12px 16px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: filled
          ? '0 0 0 3px color-mix(in oklab, var(--color-indigo) 12%, transparent)'
          : 'none',
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <SparkleIcon size={16} color="var(--color-indigo)" />
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 24 }}>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={PLACEHOLDER}
          style={{
            width: '100%',
            resize: 'none',
            outline: 'none',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontSize: 14.5,
            lineHeight: '22px',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-sans)',
            minHeight: 24,
            maxHeight: 160,
            overflow: 'auto',
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginBottom: 2 }}>
        <kbd
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-faint)',
            padding: '2px 5px',
            borderRadius: 3,
            border: '1px solid var(--color-line)',
          }}
        >
          ↵
        </kbd>
        <button
          onClick={submit}
          aria-label="Send"
          disabled={!filled}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            background: filled ? 'var(--color-indigo)' : 'var(--color-bg-3)',
            border: 'none',
            cursor: filled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: filled ? '#fff' : 'var(--color-text-faint)',
            transition: 'background 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13V3M8 3L4 7M8 3L12 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
