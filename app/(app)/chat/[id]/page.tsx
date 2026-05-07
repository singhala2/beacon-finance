import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ChatView } from '@/components/chat/ChatView';
import type { ChatMessage } from '@/components/chat/useChatStream';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatConversationPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const conversation = await db.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conversation) notFound();

  const initialMessages: ChatMessage[] = conversation.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatView initialMessages={initialMessages} initialConversationId={conversation.id} />
    </div>
  );
}
