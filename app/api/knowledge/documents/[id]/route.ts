// Phase 9 (9A) — download and delete a stored original.
// GET streams the decrypted original to its owner. DELETE removes the R2 object
// and the row; indexed chunks cascade-delete, and derived facts survive with
// their provenance link nulled (a confirmed number should not vanish because the
// user tidied up a source document).

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { isObjectStorageConfigured, getObject, deleteObject } from '@/lib/storage/objects';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findFirst({
    where: { id, userId },
    select: { objectKey: true, filename: true, mimeType: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!doc.objectKey || !isObjectStorageConfigured()) {
    return NextResponse.json({ error: 'No stored original for this document.' }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await getObject(doc.objectKey);
  } catch {
    return NextResponse.json({ error: 'Could not retrieve the file.' }, { status: 502 });
  }
  await logAudit({ userId, action: 'knowledge.document.download', targetType: 'Document', targetId: id, req });

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': doc.mimeType || 'application/octet-stream',
      'content-disposition': `inline; filename="${encodeURIComponent(doc.filename)}"`,
      'cache-control': 'private, no-store',
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findFirst({ where: { id, userId }, select: { objectKey: true } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (doc.objectKey && isObjectStorageConfigured()) {
    try {
      await deleteObject(doc.objectKey);
    } catch {
      // Proceed with row deletion; a dangling object is cleaned up out of band.
    }
  }
  await db.document.delete({ where: { id } });
  await logAudit({ userId, action: 'knowledge.document.delete', targetType: 'Document', targetId: id, req });

  return NextResponse.json({ ok: true });
}
