import type { Backend } from "@/backend";
import { config } from "@/config";
import { publishVideo } from "@/services/videos";
import { UploadKind } from "@/types";
import type { UploadSession, Video } from "@/types";

/** Creates a new upload session for a video or thumbnail. */
export function createUploadSession(
  actor: Backend,
  kind: UploadKind,
  totalSize: bigint,
  mimeType: string,
): Promise<UploadSession> {
  return actor.createUploadSession(kind, totalSize, mimeType);
}

/** Uploads a single chunk of an upload session. */
export function uploadChunk(
  actor: Backend,
  sessionId: bigint,
  chunkIndex: bigint,
  data: Uint8Array,
): Promise<bigint> {
  return actor.uploadChunk(sessionId, chunkIndex, data);
}

/** Verifies that an upload session received all of its bytes. */
export function verifyUpload(actor: Backend, sessionId: bigint): Promise<void> {
  return actor.verifyUpload(sessionId);
}

/** Finalizes a verified upload session into a video record. */
export function finalizeMedia(
  actor: Backend,
  sessionId: bigint,
  title: string,
  description: string | null,
  thumbnailAssetId: string | null,
): Promise<Video> {
  return actor.finalizeMedia(sessionId, title, description, thumbnailAssetId);
}

/** Uploads a single chunk with retry + backoff on transient failures. */
async function uploadChunkWithRetry(
  actor: Backend,
  sessionId: bigint,
  chunkIndex: bigint,
  data: Uint8Array,
): Promise<void> {
  let attempt = 0;
  for (;;) {
    try {
      await uploadChunk(actor, sessionId, chunkIndex, data);
      return;
    } catch (error) {
      attempt += 1;
      if (attempt > config.maxUploadRetries) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, config.uploadRetryBaseDelayMs * attempt),
      );
    }
  }
}

/**
 * Streams a single file into an upload session in chunks (with per-chunk
 * retry), then verifies the upload. `onProgress` receives a percentage
 * (0-100) as chunks are uploaded.
 */
async function streamFile(
  actor: Backend,
  sessionId: bigint,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  const chunkSize = config.uploadChunkSize;
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedBytes = 0;

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());
    await uploadChunkWithRetry(actor, sessionId, BigInt(index), chunk);
    uploadedBytes += chunk.length;
    onProgress?.(Math.round((uploadedBytes / file.size) * 100));
  }

  await verifyUpload(actor, sessionId);
}

/**
 * Uploads an optional thumbnail to on-chain storage as a thumbnail-kind
 * upload session. Returns the thumbnail's asset id, or null when no thumbnail
 * was provided.
 */
async function uploadThumbnail(
  actor: Backend,
  thumbnail: File | null,
): Promise<string | null> {
  if (!thumbnail) return null;
  if (thumbnail.size > config.maxThumbnailSizeBytes) {
    throw new Error(
      `Thumbnail exceeds the maximum size of ${config.maxThumbnailSizeBytes} bytes`,
    );
  }
  const session = await createUploadSession(
    actor,
    UploadKind.thumbnail,
    BigInt(thumbnail.size),
    thumbnail.type,
  );
  await streamFile(actor, session.id, thumbnail);
  return session.assetId;
}

/**
 * Orchestrates a full chunked video upload: creates the session, streams the
 * file in chunks (with per-chunk retry), verifies the upload, uploads the
 * optional thumbnail to on-chain storage, and finalizes the video into a
 * record.
 *
 * `onProgress` receives a percentage (0-100) as chunks are uploaded.
 */
export async function uploadVideo(
  actor: Backend,
  file: File,
  title: string,
  description: string | null,
  thumbnail: File | null,
  onProgress?: (percentage: number) => void,
): Promise<Video> {
  if (file.size > config.maxVideoSizeBytes) {
    throw new Error(
      `Video exceeds the maximum size of ${config.maxVideoSizeBytes} bytes`,
    );
  }

  const session = await createUploadSession(
    actor,
    UploadKind.video,
    BigInt(file.size),
    file.type,
  );

  await streamFile(actor, session.id, file, onProgress);

  // Upload the optional thumbnail to on-chain storage so it is not silently
  // dropped, then attach its asset id to the video record.
  const thumbnailAssetId = await uploadThumbnail(actor, thumbnail);

  // finalizeMedia creates the video with status #draft. Publish it so it
  // transitions to #published and appears in feeds (feeds only show
  // #published videos). Return the published video so the UI reflects it.
  const draft = await finalizeMedia(
    actor,
    session.id,
    title,
    description,
    thumbnailAssetId,
  );

  return publishVideo(actor, draft.id);
}
