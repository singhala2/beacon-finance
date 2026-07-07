// Phase 8 (8B) — document upload + schema-driven extraction.
// Upload a supported document, classify it against the registry, extract typed
// facts with Claude, and land them in the ledger as `pending`. No raw binary is
// persisted (no blob store configured): we keep only a redacted excerpt as
// provenance.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { commitFacts, type FactInput } from '@/lib/knowledge/facts';
import { getDocumentType } from '@/lib/knowledge/registry';
import { extractFacts, classifyDocument, type FilePayload } from '@/lib/knowledge/extract';
import { looksLikePii } from '@/lib/knowledge/redact';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function toFilePayload(mimeType: string, buffer: Buffer): FilePayload | null {
  if (mimeType === 'application/pdf') {
    return { kind: 'pdf', base64: buffer.toString('base64') };
  }
  if (IMAGE_TYPES.has(mimeType)) {
    return { kind: 'image', mediaType: mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', base64: buffer.toString('base64') };
  }
  if (mimeType === 'text/plain') {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const payload = toFilePayload(file.type, buffer);
  if (!payload) {
    return NextResponse.json({ error: 'Unsupported file type. Upload a PDF, image, or text file.' }, { status: 400 });
  }

  // Determine the document type: caller-provided, else classify.
  const requestedType = typeof form.get('type') === 'string' ? String(form.get('type')) : '';
  let docTypeKey = requestedType && getDocumentType(requestedType) ? requestedType : '';
  if (!docTypeKey) {
    const classified = await classifyDocument(payload).catch(() => null);
    if (!classified) {
      return NextResponse.json(
        { error: 'Could not identify the document. Please pick a document type and try again.', needsType: true },
        { status: 422 },
      );
    }
    docTypeKey = classified;
  }

  // Record the document up front so a failed extraction still leaves a trace.
  const document = await db.document.create({
    data: {
      userId,
      type: docTypeKey,
      filename: file.name || 'upload',
      mimeType: file.type,
      blobUrl: null,
      status: 'processing',
    },
  });
  await logAudit({ userId, action: 'knowledge.document.upload', targetType: 'Document', targetId: document.id, metadata: { type: docTypeKey }, req });

  try {
    const { facts, excerpt } = await extractFacts(docTypeKey, payload);

    // Never commit a value that still looks like an identifier.
    const inputs: FactInput[] = facts
      .filter((f) => !looksLikePii(f.value))
      .map((f) => ({ domain: f.domain, key: f.factKey, value: f.value, source: 'document', documentId: document.id, confidence: f.confidence }));

    const result = await commitFacts(userId, inputs, { req });

    await db.document.update({
      where: { id: document.id },
      data: { status: 'ready', processedAt: new Date(), sourceExcerpt: excerpt || null },
    });

    return NextResponse.json({
      ok: true,
      document: { id: document.id, type: docTypeKey, filename: document.filename },
      committed: result.committed,
      rejected: result.rejected,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    await db.document.update({ where: { id: document.id }, data: { status: 'failed', error: message } });
    return NextResponse.json({ error: 'We could not read that document. Please try another file.' }, { status: 502 });
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
