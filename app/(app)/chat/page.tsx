import { ChatView } from '@/components/chat/ChatView';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ChatPage({ searchParams }: Props) {
  const { q } = await searchParams;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatView prefilledQuery={q?.trim() || undefined} />
    </div>
  );
}
