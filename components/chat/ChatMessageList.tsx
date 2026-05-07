'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from './useChatStream';

type Props = {
  messages: ChatMessageType[];
  isStreaming: boolean;
};

export function ChatMessageList({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 4px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1 }} />
      {messages.map((m, i) => (
        <ChatMessage
          key={m.id}
          message={m}
          streaming={isStreaming && i === messages.length - 1 && m.role === 'assistant'}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
