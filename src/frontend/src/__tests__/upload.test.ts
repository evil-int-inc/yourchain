import type { Backend } from "@/backend";
import { uploadService } from "@/services/upload";
import { UploadKind, UploadStatus, VideoStatus } from "@/types";
import type { UploadSession, Video } from "@/types";
import { describe, expect, it, vi } from "vitest";

function makeSession(id: bigint, totalSize: bigint): UploadSession {
  return {
    id,
    status: UploadStatus.active,
    ownerId: "aaaaa-aa" as unknown as UploadSession["ownerId"],
    assetId: `asset-${id}`,
    kind: UploadKind.video,
    createdAt: 0n,
    receivedBytes: 0n,
    mimeType: "video/mp4",
    totalSize,
    chunkSize: 1_000_000n,
  };
}

function makeDraft(id: bigint, title: string): Video {
  return {
    id,
    title,
    status: VideoStatus.draft,
    ownerId: "aaaaa-aa" as unknown as Video["ownerId"],
    createdAt: 0n,
    videoAssetId: "asset-video",
    mimeType: "video/mp4",
    fileSize: 100n,
  };
}

function makePublished(id: bigint, title: string): Video {
  return {
    ...makeDraft(id, title),
    status: VideoStatus.published,
    publishedAt: 1n,
  };
}

function makeFile(size: number, type = "video/mp4"): File {
  // jsdom's Blob lacks `arrayBuffer`, which the upload service relies on when
  // slicing the file into chunks. Build a File-like object whose `slice`
  // returns a Blob-like with a working `arrayBuffer`.
  const bytes = new Uint8Array(size);
  const file = new File([bytes], "clip.mp4", { type });
  Object.defineProperty(file, "slice", {
    value: (start = 0, end = size) => ({
      arrayBuffer: async () => bytes.slice(start, end).buffer,
    }),
  });
  return file;
}

describe("uploadVideo", () => {
  it("runs the full chunked upload flow and returns the published video", async () => {
    const createUploadSession = vi.fn(async () => makeSession(7n, 100n));
    const uploadChunk = vi.fn(
      async (_s: bigint, _i: bigint, data: Uint8Array) => BigInt(data.length),
    );
    const verifyUpload = vi.fn(async () => undefined);
    const finalizeMedia = vi.fn(async () => makeDraft(1n, "My clip"));
    const publishVideo = vi.fn(async () => makePublished(1n, "My clip"));

    const actor = {
      createUploadSession,
      uploadChunk,
      verifyUpload,
      finalizeMedia,
      publishVideo,
    } as unknown as Backend;

    const file = makeFile(100);
    const result = await uploadService.uploadVideo(
      actor,
      file,
      "My clip",
      "A description",
      null,
    );

    // The published video is returned so the UI reflects it in the feed.
    expect(result.status).toBe(VideoStatus.published);
    expect(result.title).toBe("My clip");

    // Session created for the video kind with the file's size and mime type.
    expect(createUploadSession).toHaveBeenCalledWith(
      UploadKind.video,
      100n,
      "video/mp4",
    );

    // Chunks uploaded, then verified, then finalized, then published.
    expect(uploadChunk).toHaveBeenCalled();
    expect(verifyUpload).toHaveBeenCalledWith(7n);
    expect(finalizeMedia).toHaveBeenCalledWith(
      7n,
      "My clip",
      "A description",
      null,
    );
    expect(publishVideo).toHaveBeenCalledWith(1n);
  });

  it("rejects a video that exceeds the maximum size", async () => {
    const actor = {
      createUploadSession: vi.fn(),
      uploadChunk: vi.fn(),
      verifyUpload: vi.fn(),
      finalizeMedia: vi.fn(),
      publishVideo: vi.fn(),
    } as unknown as Backend;

    // 1 GB + 1 byte.
    const oversized = makeFile(1_073_741_825);
    await expect(
      uploadService.uploadVideo(actor, oversized, "Too big", null, null),
    ).rejects.toThrow(/exceeds the maximum size/);

    // No session should have been created for an oversized file.
    expect(actor.createUploadSession).not.toHaveBeenCalled();
  });

  it("reports progress as chunks are uploaded", async () => {
    const actor = {
      createUploadSession: vi.fn(async () => makeSession(7n, 100n)),
      uploadChunk: vi.fn(async (_s: bigint, _i: bigint, data: Uint8Array) =>
        BigInt(data.length),
      ),
      verifyUpload: vi.fn(async () => undefined),
      finalizeMedia: vi.fn(async () => makeDraft(1n, "My clip")),
      publishVideo: vi.fn(async () => makePublished(1n, "My clip")),
    } as unknown as Backend;

    const onProgress = vi.fn();
    await uploadService.uploadVideo(
      actor,
      makeFile(100),
      "My clip",
      null,
      null,
      onProgress,
    );

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("keeps every request below the backend's one-megabyte chunk limit", async () => {
    const uploadedChunkSizes: number[] = [];
    const actor = {
      createUploadSession: vi.fn(async () => makeSession(7n, 2_100_000n)),
      uploadChunk: vi.fn(async (_s: bigint, _i: bigint, data: Uint8Array) => {
        uploadedChunkSizes.push(data.length);
        return BigInt(data.length);
      }),
      verifyUpload: vi.fn(async () => undefined),
      finalizeMedia: vi.fn(async () => makeDraft(1n, "My clip")),
      publishVideo: vi.fn(async () => makePublished(1n, "My clip")),
    } as unknown as Backend;

    await uploadService.uploadVideo(
      actor,
      makeFile(2_100_000),
      "My clip",
      null,
      null,
    );

    expect(uploadedChunkSizes).toEqual([1_000_000, 1_000_000, 100_000]);
  });
});
