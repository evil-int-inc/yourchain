import type { Video } from "@/types";

interface VideoPlayerProps {
  video: Video;
  /** Optional poster image URL shown before playback begins. */
  poster?: string;
}

/**
 * HTML5 player backed by the immutable object's direct preview URL.
 */
export function VideoPlayer({ video, poster }: VideoPlayerProps) {
  const src = video.video.getDirectURL();
  const posterUrl = poster ?? video.thumbnail?.getDirectURL();

  return (
    <div
      data-ocid="video_player"
      className="aspect-video w-full overflow-hidden rounded-box border border-border bg-black shadow-elevated"
    >
      <video
        data-ocid="video_element"
        src={src}
        controls
        preload="metadata"
        poster={posterUrl}
        title={video.title}
        className="size-full object-contain"
      >
        <track kind="captions" label="Captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
