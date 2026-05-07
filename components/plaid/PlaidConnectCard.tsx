'use client';

import type { ReactNode } from 'react';
import { PlaidLinkButton, type ConnectedAccount } from './PlaidLinkButton';

type Props = {
  title: string;
  subline: ReactNode;
  badge?: ReactNode; // e.g., "3 accounts pulled" pill
  onSuccess: (accounts: ConnectedAccount[]) => void;
  children?: ReactNode; // optional list rendered below the header inside the card
};

// The "Connect with Plaid" gradient card. Used by ConnectBankStep + InvestmentsStep.
// Children render under the header (separated by a divider) when present.
export function PlaidConnectCard({ title, subline, badge, onSuccess, children }: Props) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--color-bg-2), var(--color-bg-1))',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
      }}
    >
      <PlaidLinkButton
        onSuccess={onSuccess}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: children ? 14 : 0,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: 'var(--color-bg-3)',
              border: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.6,
              flexShrink: 0,
            }}
          >
            plaid
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
              {badge}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
                marginTop: 2,
              }}
            >
              {subline}
            </div>
          </div>
        </div>
      </PlaidLinkButton>

      {children && (
        <div
          style={{
            borderTop: '1px solid var(--color-line)',
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
