import {
  type Notification as BackendNotification,
  type NotificationKind as BackendNotificationKind,
  type Page_1 as BackendNotificationPage,
  type Page as BackendPage,
  type User as BackendUser,
  type Video as BackendVideo,
  UserRole,
  VideoStatus,
} from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";

/** Re-exported backend enums for convenience. */
export { UserRole, VideoStatus };

export type UserId = Principal;
export type Timestamp = bigint;
export type Cursor = bigint;

export interface User extends BackendUser {}
export interface Video extends BackendVideo {}
export interface Notification extends BackendNotification {}
export type NotificationKind = BackendNotificationKind;

/** Cursor-paginated page of videos. */
export interface Page<T> {
  items: T[];
  nextCursor?: Cursor;
}

/** Cursor-paginated page of notifications. */
export interface NotificationPage {
  items: Notification[];
  nextCursor?: Cursor;
}

/** Maps a backend video page to the generic Page<T> shape. */
export function toPage(page: BackendPage): Page<Video> {
  return { items: page.items, nextCursor: page.nextCursor };
}

/** Maps a backend notification page to the generic NotificationPage shape. */
export function toNotificationPage(
  page: BackendNotificationPage,
): NotificationPage {
  return { items: page.items, nextCursor: page.nextCursor };
}
