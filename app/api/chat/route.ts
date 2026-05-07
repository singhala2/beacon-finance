import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { anthropic, CHAT_MODEL } from '@/lib/anthropic';
import { buildSystemPrompt } from '@/lib/system-prompt';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(60),
  conversationId: z.string().optional(),
});

const MAX_TOKENS = 1024;
const TITLE_MAX_LEN = 60;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Not signed in' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { messages, conversationId: incomingId } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return new Response(JSON.stringify({ error: 'No user message' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Upsert conversation: create on first turn, refresh updatedAt on subsequent.
  const conversation = incomingId
    ? await db.conversation.findFirst({ where: { id: incomingId, userId } })
    : null;

  const conversationId =
    conversation?.id ??
    (
      await db.conversation.create({
        data: {
          userId,
          title: lastUser.content.slice(0, TITLE_MAX_LEN).trim() || 'New chat',
        },
      })
    ).id;

  // Persist the user turn before streaming starts. If the connection drops mid-
  // stream we still keep the question on record.
  await db.message.create({
    data: { conversationId, role: 'user', content: lastUser.content },
  });

  const systemPrompt = await buildSystemPrompt(userId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: { type: string; [k: string]: unknown }) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      // Surface the conversation id so the client can navigate to /chat/[id]
      send({ type: 'conversation', id: conversationId });

      let assembled = '';
      try {
        const response = anthropic.messages.stream({
          model: CHAT_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            assembled += event.delta.text;
            send({ type: 'delta', text: event.delta.text });
          }
        }

        // Persist assistant turn after stream completes
        if (assembled.trim()) {
          await db.message.create({
            data: { conversationId, role: 'assistant', content: assembled },
          });
        }

        // Bump updatedAt so the conversation rises to the top of the recents list
        await db.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed';
        console.error('Anthropic stream error:', err);
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
