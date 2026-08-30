/**
 * Centralized limits and configuration for YourChain.
 *
 * All size and pagination limits live here so they are never
 * hardcoded across components or services. Tune values in one place.
 */

export const config = {
  /** Maximum accepted video file size in bytes (1 GB). */
  maxVideoSizeBytes: 1_073_741_824,

  /** Maximum accepted thumbnail image size in bytes (20 MB). */
  maxThumbnailSizeBytes: 20_971_520,

  /** Number of videos requested per feed / pagination page. */
  feedPageSize: 12,

  /** Number of notifications requested per page. */
  notificationPageSize: 20,

  /** Number of channel videos requested per page. */
  channelPageSize: 12,

  /** Accepted video MIME types for upload. */
  acceptedVideoMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],

  /** Accepted thumbnail MIME types for upload. */
  acceptedThumbnailMimeTypes: ["image/jpeg", "image/png", "image/webp"],

  /** Maximum length of a video title. */
  maxTitleLength: 100,

  /** Maximum length of a video description. */
  maxDescriptionLength: 5000,

  /** Maximum length of a display name. */
  maxDisplayNameLength: 60,

  /** Maximum length of a username. */
  maxUsernameLength: 30,

  /** Maximum length of a bio. */
  maxBioLength: 500,
} as const;

export type Config = typeof config;

/** Persisted DaisyUI theme preference used before React mounts. */
export const THEME_STORAGE_KEY = "yourchain-theme";
