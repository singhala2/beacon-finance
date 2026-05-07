import { BChatBubble } from '@/components/ui';
import type { ChatMessage as ChatMessageType } from './useChatStream';

type Props = {
  message: ChatMessageType;
  streaming?: boolean;
};

export function ChatMessage({ message, streaming }: Props) {
  const isAssistant = message.role === 'assistant';
  const showCaret = streaming && isAssistant && message.content.length > 0;
  const showLoadingDots = streaming && isAssistant && message.content.length === 0;

  return (
    <BChatBubble
      role={message.role === 'user' ? 'user' : 'beacon'}
      name={isAssistant ? 'Beacon' : undefined}
    >
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {showLoadingDots ? (
          <LoadingDots />
        ) : (
          <>
            {message.content}
            {showCaret && <span style={{ opacity: 0.6 }}>▍</span>}
          </>
        )}
      </div>
    </BChatBubble>
  );
}

function LoadingDots() {
  return (
    <span
      aria-label="Beacon is thinking"
      style={{
        display: 'inline-flex',
        gap: 4,
        alignItems: 'center',
        color: 'var(--color-text-dim)',
      }}
    >
      <span style={{ animation: 'beacon-pulse 1.2s ease-in-out infinite' }}>•</span>
      <span style={{ animation: 'beacon-pulse 1.2s ease-in-out infinite .15s' }}>•</span>
      <span style={{ animation: 'beacon-pulse 1.2s ease-in-out infinite .3s' }}>•</span>
      <style>{`
        @keyframes beacon-pulse {
          0%, 60%, 100% { opacity: 0.3 }
          30% { opacity: 1 }
        }
      `}</style>
    </span>
  );
}
