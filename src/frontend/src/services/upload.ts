import type { Backend } from "@/backend";
import { config } from "@/config";
import { videoService } from "@/services/videos";
import { UploadKind } from "@/types";
import type { UploadSession, Video } from "@/types";

/** Upload-session creation, chunking, validation, and publication. */
export class UploadService {
  /** Creates a new upload session for a video or thumbnail. */
  createUploadSession(
    actor: Backend,
    kind: UploadKind,
    totalSize: bigint,
    mimeType: string,
  ): Promise<UploadSession> {
    return actor.createUploadSession(kind, totalSize, mimeType);
  }

  /** Uploads a single chunk of an upload session. */
  uploadChunk(
    actor: Backend,
    sessionId: bigint,
    chunkIndex: bigint,
    data: Uint8Array,
  ): Promise<bigint> {
    return actor.uploadChunk(sessionId, chunkIndex, data);
  }

  /** Verifies that an upload session received all of its bytes. */
  verifyUpload(actor: Backend, sessionId: bigint): Promise<void> {
    return actor.verifyUpload(sessionId);
  }

  /** Finalizes a verified upload session into a video record. */
  finalizeMedia(
    actor: Backend,
    sessionId: bigint,
    title: string,
    description: string | null,
    thumbnailAssetId: string | null,
  ): Promise<Video> {
    return actor.finalizeMedia(sessionId, title, description, thumbnailAssetId);
  }

  /** Uploads a single chunk with retry + backoff on transient failures. */
  private async uploadChunkWithRetry(
    actor: Backend,
    sessionId: bigint,
    chunkIndex: bigint,
    data: Uint8Array,
  ): Promise<void> {
    let attempt = 0;
    for (;;) {
      try {
        await this.uploadChunk(actor, sessionId, chunkIndex, data);
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
   * Streams a file into an upload session, reports progress, and verifies it.
   */
  private async streamFile(
    actor: Backend,
    session: UploadSession,
    file: File,
    onProgress?: (percentage: number) => void,
  ): Promise<void> {
    const advertisedChunkSize = Number(session.chunkSize);
    const chunkSize =
      Number.isSafeInteger(advertisedChunkSize) && advertisedChunkSize > 0
        ? Math.min(advertisedChunkSize, config.uploadChunkSize)
        : config.uploadChunkSize;
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());
      await this.uploadChunkWithRetry(actor, session.id, BigInt(index), chunk);
      uploadedBytes += chunk.length;
      onProgress?.(Math.round((uploadedBytes / file.size) * 100));
    }

    await this.verifyUpload(actor, session.id);
  }

  /** Uploads an optional thumbnail and returns its stored asset id. */
  private async uploadThumbnail(
    actor: Backend,
    thumbnail: File | null,
  ): Promise<string | null> {
    if (!thumbnail) return null;
    if (thumbnail.size > config.maxThumbnailSizeBytes) {
      throw new Error(
        `Thumbnail exceeds the maximum size of ${config.maxThumbnailSizeBytes} bytes`,
      );
    }
    const session = await this.createUploadSession(
      actor,
      UploadKind.thumbnail,
      BigInt(thumbnail.size),
      thumbnail.type,
    );
    await this.streamFile(actor, session, thumbnail);
    return session.assetId;
  }

  /** Orchestrates a full chunked video upload and publishes the result. */
  async uploadVideo(
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

    const session = await this.createUploadSession(
      actor,
      UploadKind.video,
      BigInt(file.size),
      file.type,
    );

    await this.streamFile(actor, session, file, onProgress);
    const thumbnailAssetId = await this.uploadThumbnail(actor, thumbnail);
    const draft = await this.finalizeMedia(
      actor,
      session.id,
      title,
      description,
      thumbnailAssetId,
    );

    return videoService.publishVideo(actor, draft.id);
  }
}

export const uploadService = new UploadService();
