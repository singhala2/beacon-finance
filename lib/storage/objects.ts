// Phase 9 (9A) — object storage for original documents, on Cloudflare R2 via the
// S3-compatible API. Bytes are AES-256-GCM encrypted before they leave the
// server, so the stored object is ciphertext even if the bucket is exposed.
//
// Credential-gated: if the R2_* env vars are absent, isObjectStorageConfigured()
// is false and callers skip original storage (the rest of ingestion still runs).

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { encryptBytes, decryptBytes } from '@/lib/encryption';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

export function isObjectStorageConfigured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket);
}

let cached: S3Client | null = null;
function client(): S3Client {
  if (!isObjectStorageConfigured()) throw new Error('R2 object storage is not configured');
  if (!cached) {
    cached = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return cached;
}

/** Encrypt and store bytes under a key. Returns the object key to persist. */
export async function putObject(key: string, bytes: Buffer, contentType: string): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: encryptBytes(bytes),
      // Stored ciphertext; the real content type is recorded on the Document row.
      ContentType: 'application/octet-stream',
      Metadata: { 'original-content-type': contentType },
    }),
  );
  return key;
}

/** Fetch and decrypt an object's bytes. */
export async function getObject(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from(await res.Body!.transformToByteArray());
  return decryptBytes(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
