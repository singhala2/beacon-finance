import type { ReactNode } from 'react';
import { BeaconLogo } from './BeaconLogo';

type Props = {
  children: ReactNode;
  role?: 'user' | 'beacon';
  name?: string;
};

export function BChatBubble({ children, role = 'beacon', name }: Props) {
  const isUser = role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
        marginBottom: 12,
      }}
    >
      {!isUser && name && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-sans)',
            marginLeft: 2,
          }}
        >
          <BeaconLogo size={12} />
          <span style={{ letterSpacing: 0.2 }}>{name}</span>
        </div>
      )}
      <div
        style={{
          maxWidth: '85%',
          background: isUser ? 'var(--color-bg-3)' : 'transparent',
          border: isUser ? '1px solid var(--color-line)' : 'none',
          color: 'var(--color-text)',
          padding: isUser ? '10px 14px' : '2px 4px',
          borderRadius: isUser ? 14 : 0,
          fontSize: 15,
          lineHeight: 1.5,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
