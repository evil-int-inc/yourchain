import { createActor } from "@/backend";
import { uploadVideo } from "@/services/upload";
import type { Video } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useRef, useState } from "react";

/** Input for a video upload. */
export interface UploadVideoInput {
  file: File;
  title: string;
  description?: string;
  /** Optional thumbnail image uploaded to on-chain storage. */
  thumbnail?: File | null;
}

/**
 * Chunked video upload orchestration.
 *
 * Streams the file in chunks (with per-chunk retry + backoff), reports
 * progress via `onProgress`, and finalizes the upload into a video record.
 * Supports cancellation via `cancel()`.
 */
export function useVideoUpload() {
  const { actor, isFetching } = useActor(createActor);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef(false);

  const upload = useCallback(
    async (
      input: UploadVideoInput,
      onProgress?: (percentage: number) => void,
    ): Promise<Video> => {
      if (!actor) throw new Error("Backend is not ready");
      if (abortRef.current) throw new Error("Upload cancelled");

      abortRef.current = false;
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const video = await uploadVideo(
          actor,
          input.file,
          input.title,
          input.description ?? null,
          input.thumbnail ?? null,
          (percentage) => {
            if (abortRef.current) return;
            setProgress(percentage);
            onProgress?.(percentage);
          },
        );
        setProgress(100);
        return video;
      } catch (caught) {
        const err =
          caught instanceof Error ? caught : new Error("Upload failed");
        setError(err);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [actor],
  );

  /** Cancels an in-progress upload. */
  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    upload,
    cancel,
    progress,
    isUploading,
    isReady: !!actor && !isFetching,
    error,
  };
}
