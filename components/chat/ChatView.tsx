'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';
import { useChatStream, type ChatMessage } from './useChatStream';
import { SparkleIcon } from '@/components/ui';

type Props = {
  initialMessages?: ChatMessage[];
  initialConversationId?: string | null;
  prefilledQuery?: string;
};

const SUGGESTED_PROMPTS = [
  'What is my net worth right now?',
  'Where is my idle cash earning the least?',
  'Can I afford a $40k car given my goals?',
  'How am I tracking against my goals?',
];

export function ChatView({ initialMessages, initialConversationId, prefilledQuery }: Props) {
  const router = useRouter();
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const { messages, isStreaming, error, send } = useChatStream({
    initialMessages,
    initialConversationId,
    onConversationCreated: (id) => {
      // Use replaceState so the URL becomes /chat/[id] without triggering a
      // Next.js navigation — that would unmount ChatView and abort the
      // in-flight stream. Defer the layout refresh until streaming is done.
      if (typeof window !== 'undefined' && !initialConversationId) {
        window.history.replaceState(null, '', `/chat/${id}`);
      }
      setPendingRefresh(true);
    },
  });

  // Once streaming finishes for a freshly-created conversation, refresh the
  // server layout so the sidebar's recent chats list picks it up.
  useEffect(() => {
    if (!pendingRefresh) return;
    if (isStreaming) return;
    setPendingRefresh(false);
    router.refresh();
  }, [pendingRefresh, isStreaming, router]);

  // Auto-send the AskBar prefill exactly once
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    if (!prefilledQuery?.trim()) return;
    if (messages.length > 0) return;
    autoSentRef.current = true;
    send(prefilledQuery);
  }, [prefilledQuery, messages.length, send]);

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: 760,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {isEmpty ? (
        <EmptyState onPick={send} />
      ) : (
        <ChatMessageList messages={messages} isStreaming={isStreaming} />
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 8,
            padding: '8px 12px',
            background: 'color-mix(in oklab, var(--color-danger) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-danger) 35%, transparent)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: 'var(--color-text)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ paddingTop: 12 }}>
        <ChatComposer onSend={send} disabled={isStreaming} />
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', marginBottom: 14 }}>
          <SparkleIcon size={28} color="var(--color-indigo)" />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.6,
            margin: '0 0 8px',
            lineHeight: 1.15,
          }}
        >
          Ask Beacon anything.
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-text-muted)',
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Beacon knows your accounts, holdings, and goals. Try one of these or type your own.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPick(prompt)}
            style={{
              textAlign: 'left',
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: 13.5,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              lineHeight: 1.45,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-line-2)';
              e.currentTarget.style.background = 'var(--color-bg-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-line)';
              e.currentTarget.style.background = 'var(--color-bg-2)';
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
