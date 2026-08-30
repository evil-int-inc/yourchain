import { getDirectURL } from "@/services/storage";
import type { Video } from "@/types";
import {
  formatCount,
  formatDuration,
  timeAgo,
  timestampToDate,
} from "@/utils/format";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";

interface VideoCardProps {
  video: Video;
  /** Channel display name shown under the title. */
  channelName?: string;
  /** View count for the video. Falls back to a dash when omitted. */
  viewCount?: number | bigint;
  /** Duration in seconds for the overlay. Falls back to a dash when omitted. */
  durationSeconds?: number;
}

/**
 * A video card with a 16:9 thumbnail, a duration overlay, and metadata below
 * (title, channel name, view count, relative time). The thumbnail links to the
 * watch page and the channel name links to the channel page.
 */
export function VideoCard({
  video,
  channelName,
  viewCount,
  durationSeconds,
}: VideoCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!video.thumbnailAssetId) {
      setThumbnailUrl(null);
      return;
    }
    setThumbnailUrl(null);
    void getDirectURL(video.thumbnailAssetId)
      .then((url) => {
        if (!cancelled) setThumbnailUrl(url);
      })
      .catch(() => {
        if (!cancelled) setThumbnailUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [video.thumbnailAssetId]);

  const publishedDate = timestampToDate(video.publishedAt ?? video.createdAt);
  const relativeTime = timeAgo(publishedDate);
  const views = viewCount !== undefined ? formatCount(viewCount) : "—";

  return (
    <article
      data-ocid="video_card"
      className="group flex flex-col overflow-hidden rounded-box border border-border bg-card transition-smooth hover:shadow-elevated"
    >
      <Link
        to="/watch/$videoId"
        params={{ videoId: video.id.toString() }}
        data-ocid="video_thumbnail_link"
        aria-label={`Watch ${video.title}`}
        className="relative block aspect-video overflow-hidden bg-muted"
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-subtle">
            <Play
              className="size-10 text-primary/70 transition-colors group-hover:text-primary"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Play affordance on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-elevated transition-opacity group-hover:opacity-100">
            <Play className="size-5 fill-current" />
          </span>
        </span>

        {durationSeconds !== undefined ? (
          <span
            data-ocid="video_duration"
            className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-xs font-medium text-white"
          >
            {formatDuration(durationSeconds)}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          to="/watch/$videoId"
          params={{ videoId: video.id.toString() }}
          data-ocid="video_title_link"
          className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
        >
          {video.title}
        </Link>

        {channelName ? (
          <Link
            to="/channel/$userId"
            params={{ userId: video.ownerId.toString() }}
            data-ocid="channel_link"
            className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {channelName}
          </Link>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {views} views
          {relativeTime ? (
            <>
              <span aria-hidden="true" className="mx-1">
                ·
              </span>
              {relativeTime}
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
