import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Greeting } from '@/components/dashboard/Greeting';
import { AccountsCard } from '@/components/dashboard/AccountsCard';
import { GoalsCard } from '@/components/dashboard/GoalsCard';
import { InvestmentsCard } from '@/components/dashboard/InvestmentsCard';
import { AllocationCard } from '@/components/dashboard/AllocationCard';
import { DebtCard } from '@/components/dashboard/DebtCard';
import { CashFlowCard } from '@/components/dashboard/CashFlowCard';
import { SpendingCard, type CategorySpend } from '@/components/dashboard/SpendingCard';
import { ActivityCard, type TransactionRow } from '@/components/dashboard/ActivityCard';
import { TransactionSyncOnMount } from '@/components/dashboard/TransactionSyncOnMount';
import { AskBar } from '@/components/dashboard/AskBar';
import { BeaconsBrief } from '@/components/dashboard/BeaconsBrief';
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer';
import { generateBriefs, type Brief } from '@/lib/insights';
import type { BriefTag } from '@/components/dashboard/BriefCard';
import { formatCurrency } from '@/lib/format';
import { resolveLayout, DEFAULT_LAYOUT, type CardId } from '@/lib/dashboard-layout';
import { computeComposition, computeNetWorthHistory } from '@/lib/networth';
import type { ReactNode } from 'react';

type AllocationBucket = 'stocks' | 'bonds' | 'cash' | 'crypto' | 'other';

function bucketForHoldingType(type: string): AllocationBucket {
  switch (type) {
    case 'equity':
    case 'etf':
    case 'mutual_fund':
      return 'stocks';
    case 'bond':
      return 'bonds';
    case 'cash':
      return 'cash';
    case 'crypto':
      return 'crypto';
    default:
      return 'other';
  }
}

function buildInsightLine(netWorth: number, accountCount: number, holdingsValue: number): string {
  if (accountCount === 0) {
    return 'Connect an account to start. Beacon will read what you have and start building a picture.';
  }
  if (holdingsValue > 0 && netWorth > 0) {
    const investedShare = Math.round((holdingsValue / netWorth) * 100);
    return `Roughly ${investedShare}% of your net worth is invested. As Beacon learns your spend pattern, it will tune contribution suggestions.`;
  }
  return 'Beacon is reading your accounts. Insights on cash flow and idle balances arrive as transactions sync in.';
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const EXCLUDED_SPEND_CATEGORIES = new Set(['TRANSFER_IN', 'TRANSFER_OUT', 'INCOME', 'LOAN_PAYMENTS']);

function severityToTag(severity: string): BriefTag {
  if (severity === 'opportunity') return 'WIN';
  if (severity === 'attention') return 'WATCH';
  return 'PLAN';
}

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function DashboardHome({ searchParams }: Props) {
  const sp = await searchParams;
  const editing = sp.edit === '1';

  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const priorMonthStart = startOfMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));

  const historyWindowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 90 * 86_400_000);

  const [user, accounts, holdings, goals, transactionCount, monthTxs, recentTxs, dbInsights, historyTxs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, email: true, dashboardLayout: true },
    }),
    db.financialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        institution: true,
        name: true,
        mask: true,
        type: true,
        subtype: true,
        balanceCurrent: true,
        currency: true,
      },
    }),
    db.holding.findMany({
      where: { account: { userId } },
      select: { id: true, accountId: true, symbol: true, name: true, currentValue: true, type: true },
    }),
    db.goal.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        targetAmount: true,
        targetDate: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.transaction.count({ where: { userId } }),
    db.transaction.findMany({
      where: { userId, date: { gte: priorMonthStart } },
      select: { amount: true, date: true, category: true, pending: true },
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { account: { select: { institution: true } } },
    }),
    db.insight.findMany({
      where: { userId, dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: historyWindowStart } },
      select: { date: true, amount: true, accountId: true },
    }),
  ]);

  if (!user) return null;

  const layout = user.dashboardLayout ? resolveLayout(user.dashboardLayout) : DEFAULT_LAYOUT;
  const needsInitialSync = accounts.length > 0 && transactionCount === 0;

  // Net worth + composition (loan + credit both count as debt; computeComposition
  // unifies the logic that used to drift between page.tsx and system-prompt.ts).
  const composition = computeComposition(accounts, holdings);
  const netWorth = composition.total;
  const debtTotal = composition.debt;
  const networthHistory = computeNetWorthHistory(accounts, holdings, historyTxs, 90);

  // Allocation
  const allocationRaw: Record<AllocationBucket, number> = {
    stocks: 0, bonds: 0, cash: 0, crypto: 0, other: 0,
  };
  for (const h of holdings) {
    allocationRaw[bucketForHoldingType(h.type)] += h.currentValue;
  }
  const totalHoldings = Object.values(allocationRaw).reduce((a, b) => a + b, 0);
  const allocation: Record<AllocationBucket, number> = totalHoldings > 0
    ? {
        stocks: allocationRaw.stocks / totalHoldings,
        bonds: allocationRaw.bonds / totalHoldings,
        cash: allocationRaw.cash / totalHoldings,
        crypto: allocationRaw.crypto / totalHoldings,
        other: allocationRaw.other / totalHoldings,
      }
    : allocationRaw;

  // Cash flow aggregate
  const periods = {
    current: { income: 0, expenses: 0, net: 0 },
    prior: { income: 0, expenses: 0, net: 0 },
  };
  for (const t of monthTxs) {
    if (t.pending) continue;
    const bucket = t.date >= currentMonthStart ? periods.current : periods.prior;
    if (t.amount < 0) bucket.income += -t.amount;
    else bucket.expenses += t.amount;
  }
  periods.current.net = periods.current.income - periods.current.expenses;
  periods.prior.net = periods.prior.income - periods.prior.expenses;

  // Spending by category
  const byCategoryCurrent = new Map<string, number>();
  const byCategoryPrior = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.pending || t.amount <= 0) continue;
    if (t.category && EXCLUDED_SPEND_CATEGORIES.has(t.category)) continue;
    const map = t.date >= currentMonthStart ? byCategoryCurrent : byCategoryPrior;
    const key = t.category ?? 'UNCATEGORIZED';
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  const categoriesAll = new Set([...byCategoryCurrent.keys(), ...byCategoryPrior.keys()]);
  const categories: CategorySpend[] = Array.from(categoriesAll)
    .map((cat) => ({
      category: cat,
      thisMonth: byCategoryCurrent.get(cat) ?? 0,
      lastMonth: byCategoryPrior.get(cat) ?? 0,
    }))
    .sort((a, b) => b.thisMonth - a.thisMonth);

  // Activity
  const activity: TransactionRow[] = recentTxs.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    currency: t.currency,
    name: t.name,
    merchantName: t.merchantName,
    category: t.category,
    pending: t.pending,
    accountInstitution: t.account.institution,
  }));

  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const insightLine = buildInsightLine(netWorth, accounts.length, totalHoldings);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long' });

  // Cash on hand: depository balances only
  const cashOnHand = accounts
    .filter((a) => a.type === 'depository')
    .reduce((sum, a) => sum + (a.balanceCurrent ?? 0), 0);

  const currentMonthTxs = monthTxs.filter((t) => t.date >= currentMonthStart);
  const priorMonthTxs = monthTxs.filter((t) => t.date < currentMonthStart);

  // Prefer AI-generated insights when present. Fall back to hardcoded triggers
  // for fresh users (before the cron has run for them).
  const briefs: Brief[] = dbInsights.length > 0
    ? dbInsights.map((i) => ({
        id: i.id,
        tag: severityToTag(i.severity),
        title: i.headline,
        body: i.body,
        cta: 'Discuss in chat',
        score: 0,
      }))
    : generateBriefs({
        accounts,
        currentMonthTxs,
        priorMonthTxs,
        goals: goals.map((g) => ({
          name: g.name,
          targetAmount: g.targetAmount,
          targetDate: g.targetDate,
        })),
      });

  const cardContent: Record<CardId, ReactNode> = {
    cashflow: <CashFlowCard current={periods.current} prior={periods.prior} monthLabel={monthLabel} />,
    spending: <SpendingCard categories={categories} />,
    activity: <ActivityCard transactions={activity} />,
    accounts: <AccountsCard accounts={accounts} />,
    goals: <GoalsCard goals={goals} />,
    investments: <InvestmentsCard holdings={holdings} />,
    allocation: <AllocationCard allocation={allocation} />,
    debt: <DebtCard creditAccounts={creditAccounts} />,
  };

  return (
    <>
      {needsInitialSync && <TransactionSyncOnMount />}
      <Greeting
        firstName={user.firstName}
        email={user.email}
        subline={
          accounts.length > 0
            ? `Tracking ${formatCurrency(netWorth, { maximumFractionDigits: 0 })} across ${accounts.length} account${accounts.length === 1 ? '' : 's'}.`
            : undefined
        }
      />

      <DashboardCustomizer
        initialLayout={layout}
        cardContent={cardContent}
        editing={editing}
        heroData={{
          netWorth,
          cash: cashOnHand,
          investable: totalHoldings,
          debt: debtTotal,
          monthlyCashFlow: periods.current.net,
          accountCount: accounts.length,
          monthLabel,
          insightLine,
          composition,
          history: networthHistory,
        }}
        topSlot={
          <>
            <AskBar />
            <BeaconsBrief briefs={briefs} />
          </>
        }
      />
    </>
  );
}

