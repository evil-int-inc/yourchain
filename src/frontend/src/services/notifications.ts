import type { Backend } from "@/backend";
import type { Cursor, Notification, NotificationPage } from "@/types";
import { toNotificationPage } from "@/types";

/** Fetches a cursor-paginated page of the caller's notifications. */
export async function getNotifications(
  actor: Backend,
  cursor: Cursor,
  limit: bigint,
): Promise<NotificationPage> {
  return toNotificationPage(await actor.getNotifications(cursor, limit));
}

/** Returns the caller's unread notification count. */
export function getUnreadNotificationCount(actor: Backend): Promise<bigint> {
  return actor.getUnreadNotificationCount();
}

/** Marks all of the caller's notifications as read. */
export function markNotificationsRead(actor: Backend): Promise<void> {
  return actor.markNotificationsRead();
}

/** Convenience type re-export for consumers. */
export type { Notification };
