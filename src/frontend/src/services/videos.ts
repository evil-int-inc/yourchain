import type { Backend } from "@/backend";
import type { Cursor, Page, UserId, Video } from "@/types";
import { toPage } from "@/types";

/** Fetches a cursor-paginated page of the global feed. */
export async function getFeed(
  actor: Backend,
  cursor: Cursor,
  limit: bigint,
): Promise<Page<Video>> {
  return toPage(await actor.getFeed(cursor, limit));
}

/** Fetches a cursor-paginated page of the subscription feed. */
export async function getSubscriptionFeed(
  actor: Backend,
  cursor: Cursor,
  limit: bigint,
): Promise<Page<Video>> {
  return toPage(await actor.getSubscriptionFeed(cursor, limit));
}

/** Fetches a cursor-paginated page of a channel's videos. */
export async function getChannelVideos(
  actor: Backend,
  userId: UserId,
  cursor: Cursor,
  limit: bigint,
): Promise<Page<Video>> {
  return toPage(await actor.getChannelVideos(userId, cursor, limit));
}

/** Fetches a cursor-paginated page of the caller's own videos. */
export async function getMyVideos(
  actor: Backend,
  cursor: Cursor,
  limit: bigint,
): Promise<Page<Video>> {
  return toPage(await actor.getMyVideos(cursor, limit));
}

/** Fetches a single video by id. */
export function getVideo(
  actor: Backend,
  videoId: bigint,
): Promise<Video | null> {
  return actor.getVideo(videoId);
}

/** Deletes a video owned by the caller. */
export function deleteVideo(actor: Backend, videoId: bigint): Promise<void> {
  return actor.deleteVideo(videoId);
}

/** Publishes a draft video. */
export function publishVideo(actor: Backend, videoId: bigint): Promise<Video> {
  return actor.publishVideo(videoId);
}
