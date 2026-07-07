// Phase 9 (9B) — open document ingestion.
// Accept any document, store the encrypted original (9A), then run the pipeline:
// extract text, classify open-endedly, summarize, and (for known registry types)
// extract structured facts. Unknown types are stored and summarized, never
// rejected.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { FilePayload } from '@/lib/knowledge/extract';
import { processDocument } from '@/lib/knowledge/ingest';
import { isObjectStorageConfigured, putObject } from '@/lib/storage/objects';
import { hasRoom } from '@/lib/knowledge/quota';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

// A Claude-readable payload for text extraction, or null when the type cannot be
// read (the original is still stored; it just is not transcribed or indexed).
function toFilePayload(mimeType: string, buffer: Buffer): FilePayload | null {
  if (mimeType === 'application/pdf') {
    return { kind: 'pdf', base64: buffer.toString('base64') };
  }
  if (IMAGE_TYPES.has(mimeType)) {
    return { kind: 'image', mediaType: mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', base64: buffer.toString('base64') };
  }
  // Text-like types decode directly.
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'text/csv') {
    return { kind: 'text', text: buffer.toString('utf-8') };
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be between 1 byte and 10 MB' }, { status: 400 });
  }
  if (!(await hasRoom(userId, file.size))) {
    return NextResponse.json({ error: 'You have reached your document storage limit.' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const payload = toFilePayload(file.type, buffer);

  // Record the document up front so a failed ingestion still leaves a trace.
  const document = await db.document.create({
    data: {
      userId,
      type: '',
      filename: file.name || 'upload',
      mimeType: file.type,
      sizeBytes: file.size,
      status: 'processing',
    },
  });
  await logAudit({ userId, action: 'knowledge.document.upload', targetType: 'Document', targetId: document.id, req });

  // Store the encrypted original when R2 is configured. Failure here does not
  // block ingestion; the document simply has no retrievable original.
  if (isObjectStorageConfigured()) {
    try {
      const key = `documents/${userId}/${document.id}`;
      await putObject(key, buffer, file.type);
      await db.document.update({ where: { id: document.id }, data: { objectKey: key } });
    } catch {
      // Left as objectKey: null; surfaced via status/logs, not fatal.
    }
  }

  // Types Claude cannot read are still stored, just not transcribed or indexed.
  if (!payload) {
    await db.document.update({
      where: { id: document.id },
      data: { type: 'other', docKind: 'file', status: 'ready', processedAt: new Date() },
    });
    return NextResponse.json({
      ok: true,
      document: { id: document.id, filename: document.filename },
      stored: Boolean(isObjectStorageConfigured()),
      read: false,
    });
  }

  try {
    const result = await processDocument(userId, document.id, payload, { req });
    return NextResponse.json({
      ok: true,
      document: { id: document.id, filename: document.filename, docKind: result.docKind, knownType: result.knownType },
      committed: result.committed,
      indexed: result.indexed,
      read: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed';
    await db.document.update({ where: { id: document.id }, data: { status: 'failed', error: message } });
    return NextResponse.json({ error: 'We stored the file but could not read it. You can still keep it here.' }, { status: 502 });
  }
}

// List the user's uploaded documents (newest first) for the Hub.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const documents = await db.document.findMany({
    where: { userId },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, type: true, filename: true, status: true, uploadedAt: true, sourceExcerpt: true },
  });
  return NextResponse.json({ documents });
}
