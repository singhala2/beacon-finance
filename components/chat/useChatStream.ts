'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type Options = {
  initialMessages?: ChatMessage[];
  initialConversationId?: string | null;
  onConversationCreated?: (id: string) => void;
};

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'conversation'; id: string };

export function useChatStream(opts: Options = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(opts.initialMessages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<string | null>(opts.initialConversationId ?? null);
  const onCreatedRef = useRef(opts.onConversationCreated);
  onCreatedRef.current = opts.onConversationCreated;

  // Mirror state into a ref so `send` can read the latest value without
  // recreating the callback on every render.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };

    const next = [...messagesRef.current, userMsg, assistantMsg];
    messagesRef.current = next;
    setMessages(next);
    setIsStreaming(true);
    setError(null);

    const postedMessages = next
      .filter((m) => m.id !== assistantMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: postedMessages,
          conversationId: conversationIdRef.current ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line.slice(5).trim()) as StreamEvent;
          } catch {
            continue;
          }

          if (evt.type === 'delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: m.content + evt.text } : m,
              ),
            );
          } else if (evt.type === 'conversation') {
            const wasNew = !conversationIdRef.current;
            conversationIdRef.current = evt.id;
            if (wasNew) onCreatedRef.current?.(evt.id);
          } else if (evt.type === 'error') {
            setError(evt.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, error, send };
}
