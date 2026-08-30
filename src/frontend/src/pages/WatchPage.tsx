import { createActor } from "@/backend";
import { SubscribeButton } from "@/components/subscription/SubscribeButton";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/services/hooks";
import { getChannel } from "@/services/users";
import { getVideo } from "@/services/videos";
import { type User, type Video, VideoStatus } from "@/types";
import { formatBytes, timeAgo, timestampToDate } from "@/utils/format";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { VideoOff } from "lucide-react";

/** Fetches a single video by id from the backend. */
function useGetVideo(videoId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Video | null>({
    queryKey: ["video", videoId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return getVideo(actor, videoId);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Fetches the channel (owner) profile for a video. */
function useGetChannel(ownerId: Principal | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<User | null>({
    queryKey: ["channel", ownerId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !ownerId) return null;
      return getChannel(actor, ownerId);
    },
    enabled: !!actor && !isFetching && !!ownerId,
  });
}

export function WatchPage() {
  const { videoId } = useParams({ from: "/watch/$videoId" });
  const { principal } = useAuth();

  const parsedId = /^\d+$/.test(videoId) ? BigInt(videoId) : null;
  const videoQuery = useGetVideo(parsedId ?? 0n);
  const video = videoQuery.data ?? null;

  const ownerId = video?.ownerId ?? null;
  const channelQuery = useGetChannel(ownerId);
  const channel = channelQuery.data ?? null;

  const isLoading = videoQuery.isLoading || (!!video && channelQuery.isLoading);
  const isOwnChannel =
    !!principal && !!ownerId && principal === ownerId.toString();

  if (videoQuery.isError) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Couldn't load this video"
          message="Something went wrong while fetching the video. Please try again."
          onRetry={() => void videoQuery.refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Skeleton className="aspect-video w-full rounded-box" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton circle className="size-10" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video || video.status !== VideoStatus.published) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<VideoOff className="size-7" aria-hidden="true" />}
          title="Video unavailable"
          description="This video doesn't exist or hasn't been published yet."
        />
      </div>
    );
  }

  const channelOwnerId = video.ownerId;
  const publishedDate = timestampToDate(video.publishedAt ?? video.createdAt);
  const channelName = channel?.displayName ?? channel?.username ?? "Channel";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <VideoPlayer video={video} />

      <div className="mt-4">
        <h1
          data-ocid="video_title"
          className="font-display text-xl font-semibold text-foreground sm:text-2xl"
        >
          {video.title}
        </h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span data-ocid="video_size">{formatBytes(video.fileSize)}</span>
          <span aria-hidden="true">•</span>
          <span data-ocid="video_date">{timeAgo(publishedDate)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/channel/$userId"
            params={{ userId: channelOwnerId.toString() }}
            data-ocid="channel_link"
            className="group flex min-w-0 items-center gap-3"
          >
            <Avatar name={channelName} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                {channelName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                @{channel?.username ?? "channel"}
              </span>
            </span>
          </Link>

          <SubscribeButton
            channelId={channelOwnerId.toString()}
            hidden={isOwnChannel}
            disabled={!principal}
          />
        </div>

        {video.description ? (
          <div className="mt-4 rounded-box border border-border bg-card p-4">
            <p
              data-ocid="video_description"
              className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            >
              {video.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
