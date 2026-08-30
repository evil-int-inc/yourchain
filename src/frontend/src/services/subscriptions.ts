import type { Backend } from "@/backend";
import type { UserId } from "@/types";

/** Subscribes the caller to a channel. */
export function subscribe(actor: Backend, channelId: UserId): Promise<void> {
  return actor.subscribe(channelId);
}

/** Unsubscribes the caller from a channel. */
export function unsubscribe(actor: Backend, channelId: UserId): Promise<void> {
  return actor.unsubscribe(channelId);
}

/** Returns whether the caller is subscribed to a channel. */
export function isSubscribed(
  actor: Backend,
  channelId: UserId,
): Promise<boolean> {
  return actor.isSubscribed(channelId);
}

/** Returns the ids of channels the caller is subscribed to. */
export function getSubscribedChannels(actor: Backend): Promise<Array<UserId>> {
  return actor.getSubscribedChannels();
}

/** Returns the subscriber count of a channel. */
export function getSubscriberCount(
  actor: Backend,
  channelId: UserId,
): Promise<bigint> {
  return actor.getSubscriberCount(channelId);
}
