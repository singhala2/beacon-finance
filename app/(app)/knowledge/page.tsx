import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Card, CardHeader } from '@/components/dashboard/Card';
import { UploadCard } from '@/components/knowledge/UploadCard';
import { DOMAINS, getFactType, type FactType, type MarginalWeight } from '@/lib/knowledge/registry';
import { getConfirmedFacts, getFactsByStatus } from '@/lib/knowledge/facts';
import { factLabel, formatFactValue } from '@/lib/knowledge/display';

// Phase 8 (8D) — the Knowledge Hub, rendered generically from the registry.
// Every domain here comes from DOMAINS × the user's confirmed facts. Adding a
// new domain or fact type is a registry declaration; this page does not change.
// No completeness score: suggestions are open invitations ranked by marginal
// utility, never progress toward a target.

const WEIGHT_ORDER: Record<MarginalWeight, number> = { high: 0, medium: 1, low: 2 };

const SOURCE_LABEL: Record<string, string> = {
  document: 'Document',
  chat: 'Chat',
  manual: 'Manual',
  plaid: 'Plaid',
  system: 'Beacon',
};

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const [confirmed, pending] = await Promise.all([
    getConfirmedFacts(userId),
    getFactsByStatus(userId, 'pending'),
  ]);

  // Group confirmed facts by domain.
  const byDomain = new Map<string, typeof confirmed>();
  for (const f of confirmed) {
    const arr = byDomain.get(f.domain) ?? [];
    arr.push(f);
    byDomain.set(f.domain, arr);
  }

  const suggestions = (factTypes: readonly FactType[], present: Set<string>): FactType[] =>
    factTypes
      .filter((ft) => !present.has(ft.key))
      .sort((a, b) => WEIGHT_ORDER[a.marginalWeight] - WEIGHT_ORDER[b.marginalWeight]);

  const populated = DOMAINS.filter((d) => (byDomain.get(d.key)?.length ?? 0) > 0);
  const empty = DOMAINS.filter((d) => (byDomain.get(d.key)?.length ?? 0) === 0);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, margin: '0 0 4px', lineHeight: 1.1 }}>
          Knowledge
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Everything Beacon knows about you that your accounts cannot show. Upload a document or tell Beacon
          in chat, and it all lands here, organized by what it is about.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <UploadCard />
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Link href="/knowledge/review" style={{ textDecoration: 'none' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-mint)' }}>{pending.length}</span>
                fact{pending.length === 1 ? '' : 's'} waiting for you to confirm.
                <span style={{ flex: 1 }} />
                <span style={{ color: 'var(--color-text)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>Review →</span>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Populated domains: the confirmed facts, plus an open invitation to add more. */}
      {populated.map((domain) => {
        const facts = byDomain.get(domain.key) ?? [];
        const present = new Set(facts.map((f) => f.key));
        const more = suggestions(domain.factTypes, present).slice(0, 4);
        return (
          <div key={domain.key} style={{ marginBottom: 12 }}>
            <Card>
              <CardHeader
                eyebrow={domain.label}
                trailing={
                  <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {facts.length} fact{facts.length === 1 ? '' : 's'}
                  </span>
                }
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {facts.map((f) => {
                  const ft = getFactType(f.domain, f.key);
                  return (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', flex: 1, minWidth: 0 }}>
                        {factLabel(f.domain, f.key)}
                      </span>
                      <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                        {formatFactValue(f.valueType, f.valueJson, ft?.unit)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', width: 62, textAlign: 'right' }}>
                        {SOURCE_LABEL[f.source] ?? f.source}
                      </span>
                    </div>
                  );
                })}
              </div>
              {more.length > 0 && <AddMore items={more} />}
            </Card>
          </div>
        );
      })}

      {/* Everything else: compact invitations. No domain is ever "done". */}
      {empty.length > 0 && (
        <Card>
          <CardHeader eyebrow="Add more context" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {empty.map((domain) => {
              const more = suggestions(domain.factTypes, new Set<string>()).slice(0, 3);
              return (
                <div key={domain.key}>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 4 }}>{domain.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {more.map((ft) => (
                      <SuggestionChip key={ft.key} label={ft.label} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function AddMore({ items }: { items: FactType[] }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-line)' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        Beacon could still use
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((ft) => (
          <SuggestionChip key={ft.key} label={ft.label} />
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        padding: '0 10px',
        fontSize: 12,
        color: 'var(--color-text-muted)',
        background: 'var(--color-bg-3)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {label}
    </span>
  );
}
