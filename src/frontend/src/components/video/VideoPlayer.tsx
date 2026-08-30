import { storageService } from "@/services/storage";
import type { Video } from "@/types";
import { useEffect, useState } from "react";

interface VideoPlayerProps {
  video: Video;
  /** Optional poster image URL shown before playback begins. */
  poster?: string;
}

/**
 * HTML5 video player for a single video. The source is resolved through the
 * storage service so it supports range-request streaming, and the poster
 * falls back to the video's thumbnail when no explicit poster is provided.
 */
export function VideoPlayer({ video, poster }: VideoPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(poster ?? null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    void storageService
      .getDirectURL(video.videoAssetId)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [video.videoAssetId]);

  useEffect(() => {
    let cancelled = false;
    if (poster) {
      setPosterUrl(poster);
      return;
    }
    if (!video.thumbnailAssetId) {
      setPosterUrl(null);
      return;
    }
    setPosterUrl(null);
    void storageService
      .getDirectURL(video.thumbnailAssetId)
      .then((url) => {
        if (!cancelled) setPosterUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPosterUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [poster, video.thumbnailAssetId]);

  return (
    <div
      data-ocid="video_player"
      className="aspect-video w-full overflow-hidden rounded-box border border-border bg-black shadow-elevated"
    >
      {src ? (
        <video
          data-ocid="video_element"
          controls
          preload="metadata"
          poster={posterUrl ?? undefined}
          title={video.title}
          className="size-full object-contain"
        >
          <source src={src} type={video.mimeType} />
          <track kind="captions" label="Captions" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div
          data-ocid="video_loading_state"
          className="flex size-full items-center justify-center"
        >
          <div
            className="size-10 animate-pulse rounded-full bg-muted"
            aria-hidden="true"
          />
          <span className="sr-only">Loading video</span>
        </div>
      )}
    </div>
  );
}
