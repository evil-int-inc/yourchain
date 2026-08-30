mixin () {
  public query func getApiDoc() : async Text {
    "# YourChain Backend API

YourChain is a YouTube-like video platform built 100% on-chain on the Internet
Computer. This document describes the public Candid API of the backend canister:
its purpose, authentication and authorization model, identity derivation, units
and encodings, lifecycle and polling rules, mutation retry safety, and the
non-obvious integration gotchas.

## Purpose

The backend stores users (channel profiles), videos and their upload sessions,
subscriptions, and per-user notifications. It exposes:

- Public channel profiles and a global, published-only video feed with backend
  cursor pagination.
- A chunked/resumable upload pipeline for videos (up to 1 GB) and thumbnails
  (up to 20 MB).
- Subscribe/unsubscribe and a subscription feed of published videos.
- Per-user notifications for new subscribers and new videos from subscribed
  channels.
- An OQL data layer (`schema` / `execute`) that makes the persisted data
  queryable by the Caffeine Data Intelligence agent and, per entity, by end
  users.

## Public methods

### Authentication & authorization

- `_internet_identity_sign_in_start() : async Blob`
- `_internet_identity_sign_in_finish() : async Result.Result<(), Error>`
- `_initialize_access_control() : async ()`
- `getCallerUserRole() : async UserRole`
- `assignCallerUserRole(user : Principal, role : UserRole) : async ()`
- `isCallerAdmin() : async Bool`

### Users / profiles

- `getChannel(userId : Principal) : async ?User`
- `getChannelByUsername(username : Text) : async ?User`
- `getCallerProfile() : async ?User`
- `saveProfile(displayName : Text, username : Text, avatar : ?Text, bio : ?Text) : async User`

### Upload & storage

- `createUploadSession(kind : UploadKind, totalSize : Nat, mimeType : Text) : async UploadSession`
- `uploadChunk(sessionId : Nat, chunkIndex : Nat, data : Blob) : async Nat`
- `verifyUpload(sessionId : Nat) : async ()`
- `finalizeMedia(sessionId : Nat, title : Text, description : ?Text, thumbnailAssetId : ?Text) : async Video`
- `publishVideo(videoId : Nat) : async Video`
- `deleteVideo(videoId : Nat) : async ()`
- `getVideo(videoId : Nat) : async ?Video`
- `getMyVideos(cursor : Nat, limit : Nat) : async Page<Video>`
- `getStorageProviders() : async [Text]`
- `registerStorageProvider(providerId : Text) : async ()`

### Subscriptions

- `subscribe(channelId : Principal) : async ()`
- `unsubscribe(channelId : Principal) : async ()`
- `isSubscribed(channelId : Principal) : async Bool`
- `getSubscribedChannels() : async [Principal]`
- `getSubscriberCount(channelId : Principal) : async Nat`

### Notifications

- `getNotifications(cursor : Nat, limit : Nat) : async Page<Notification>`
- `getUnreadNotificationCount() : async Nat`
- `markNotificationsRead() : async ()`

### Feed

- `getFeed(cursor : Nat, limit : Nat) : async Page<Video>`
- `getSubscriptionFeed(cursor : Nat, limit : Nat) : async Page<Video>`
- `getChannelVideos(userId : Principal, cursor : Nat, limit : Nat) : async Page<Video>`

### OQL data layer

- `schema() : async Text` — JSON schema of the queryable entities.
- `execute(qJson : Text) : async Result` — run a JSON query against the entities.

## Authentication and authorization

### Registration prerequisite

Access is gated by role-based access control. Before any role-guarded call
(guarded queries included), a signed-in caller must register by calling
`_initialize_access_control()` once. The **first** caller to register becomes
`#admin`; every subsequent caller becomes `#user`. Anonymous callers are
skipped and never registered. `_internet_identity_sign_in_finish()` also
registers the caller as part of the sign-in flow.

Roles are `#admin`, `#user`, and `#guest` (anonymous). A caller with `#admin`
passes every permission check; `#user` passes checks that require `#user`;
`#guest` (anonymous) fails checks that require `#user` or `#admin`.

### What an unregistered or anonymous caller receives

- **Anonymous caller** on a guarded endpoint that traps: the call traps with
  `Unauthorized: Only users can perform this action` (or
  `Unauthorized: Only admins can perform this action` for
  `registerStorageProvider`).
- **Anonymous caller** on a guarded endpoint that returns early instead of
  trapping: `getCallerProfile` returns `null`, `isSubscribed` returns `false`,
  `getSubscribedChannels` returns `[]`, `getUnreadNotificationCount` returns
  `0`, and `getSubscriptionFeed` returns an empty page.
- **Unregistered signed-in (non-anonymous) caller**: the permission check
  itself traps with `User is not registered`, because the role lookup cannot
  find the caller. This applies to every guarded endpoint, including the ones
  that return early for anonymous callers.

### Why a caller can be unregistered

Registration happens only when a caller signs in through the app's own
frontend (or calls `_initialize_access_control` directly). A principal that
never did so is unregistered even when it belongs to the app's owner. A
signed-in caller derived against a different origin is a different principal
than the one the frontend registered, and therefore appears unregistered.

### Identity derivation

The frontend pins an Internet Identity derivation origin, published at
`/.well-known/ii-derivation-origin` when available. An agent already holding
the user's Internet Identity authorization derives the correct per-app
principal against that origin, for example:

    icp identity link web <name> --app <host>

Such a delegation acts with the user's full authority in this app until it
expires.

## Units and encodings

- **Timestamps** are nanoseconds since the Unix epoch (`Time.now()`), typed as
  `Int`. `createdAt` and `publishedAt` use this encoding.
- **`UserId`** is a `Principal` (the caller's principal).
- **`Cursor`** is a `Nat`. `0` means \"first page\"; otherwise it is the id of
  the last item already returned (see Lifecycle and polling).
- **`Page<T>`** is `{ items : [T]; nextCursor : ?Nat }`.
- **`VideoStatus`**: `#draft`, `#processing`, `#published`, `#deleted`.
- **`UploadKind`**: `#video`, `#thumbnail`.
- **`UploadStatus`**: `#active`, `#completed`, `#finalized`, `#cancelled`.
- **`NotificationKind`**: `#newSubscriber { channelId }` or
  `#newVideo { channelId; videoId }`.
- **`UserRole`**: `#admin`, `#user`, `#guest`.
- **Optional fields**: `avatar`, `bio`, `description`, `thumbnailAssetId` are
  `?Text`; `publishedAt` is `?Int`. `null` means absent.
- **`data`** in `uploadChunk` is a `Blob` of raw bytes.
- **`assetId`** is an opaque `Text` handle into the on-chain storage layer; it
  is not a URL and should not be parsed by clients.

## Lifecycle and polling

### Upload pipeline

The upload flow is:

    createUploadSession → uploadChunk (repeated) → verifyUpload → finalizeMedia → publishVideo

1. `createUploadSession(kind, totalSize, mimeType)` validates the size against
   the per-kind limit (1 GB for `#video`, 20 MB for `#thumbnail`) and returns a
   session in `#active` status.
2. `uploadChunk(sessionId, chunkIndex, data)` appends bytes to the session and
   returns the new `receivedBytes`. Call it repeatedly until
   `receivedBytes == totalSize`.
3. `verifyUpload(sessionId)` marks the session `#completed` once
   `receivedBytes == totalSize`; otherwise it traps `Upload incomplete`.
4. `finalizeMedia(sessionId, title, description, thumbnailAssetId)` creates a
   `#draft` video and marks the session `#finalized`. It traps `Upload not
   completed` if the session is not `#completed`. The optional
   `thumbnailAssetId` attaches a previously uploaded thumbnail asset to the
   video's `thumbnailAssetId` field; pass `null` for no thumbnail. When a
   thumbnail asset id is supplied, the backend verifies it belongs to a
   `#thumbnail` upload session owned by the caller and traps
   `Unauthorized: Thumbnail asset not owned by caller` otherwise.
5. `publishVideo(videoId)` sets the video to `#published`, records
   `publishedAt`, and notifies the owner's subscribers with a `#newVideo`
   notification.

Only videos with `#published` status appear in `getFeed`,
`getSubscriptionFeed`, and `getChannelVideos`. `getVideo` returns a video only
if it is `#published` or the caller is its owner.

### Pagination

All paginated endpoints (`getFeed`, `getSubscriptionFeed`, `getChannelVideos`,
`getMyVideos`, `getNotifications`) return newest-first by descending id. Pass
`cursor = 0` for the first page, then pass the returned `nextCursor` as the
next `cursor`. Stop polling when `nextCursor` is `null`. A `limit` of `0`
returns an empty page with `nextCursor = null`.

## Mutation retry safety

- **`uploadChunk` is NOT idempotent.** The backend ignores `chunkIndex` and
  adds `data.size()` to `receivedBytes` on every call. Re-sending a chunk that
  already landed double-counts its bytes: the call traps `Chunk exceeds
  remaining size` once the running total would exceed `totalSize`, and a
  double-counted-but-under-limit total makes `verifyUpload` trap `Upload
  incomplete`. Do not blindly retry chunks; track which chunks landed and
  resume from the last acknowledged `receivedBytes`.
- **`subscribe` / `unsubscribe`** are idempotent: subscribing twice to the same
  channel is a no-op (a set add), and unsubscribing from a channel you do not
  follow is a no-op. `subscribe` traps `Cannot subscribe to yourself` when
  `channelId == caller`.
- **`publishVideo` / `deleteVideo`** are idempotent status transitions: they
  overwrite the video's status. `publishVideo` re-notifies subscribers on every
  call, so call it once.
- **`markNotificationsRead`** is idempotent.
- **`saveProfile`** upserts the caller's profile. It traps `Username already
  taken` if the requested `username` is held by another user.

## Errors, traps, and limits

- **Traps** (opaque rejects, not `Result` errors): `Unauthorized: Only users
  can perform this action`, `Unauthorized: Only admins can perform this
  action`, `Unauthorized: Not the session owner`, `Unauthorized: Not the video
  owner`, `User is not registered`, `Cannot subscribe to yourself`, `Username
  already taken`, `File too large`, `Upload session not found`, `Video not
  found`, `Upload session not active`, `Chunk exceeds remaining size`, `Upload
  incomplete`, `Upload not completed`, `Unauthorized: Thumbnail asset not owned
  by caller`.
- **Size limits**: videos up to 1 GB, thumbnails up to 20 MB, enforced at
  `createUploadSession`. Chunks are capped at 1 MB each by the backend's chunk
  size.
- **Ownership**: `uploadChunk`, `verifyUpload`, `finalizeMedia` require the
  caller to own the session; `finalizeMedia` additionally requires any supplied
  `thumbnailAssetId` to belong to a `#thumbnail` upload session owned by the
  caller; `publishVideo`, `deleteVideo` require the caller to own the video.

## Non-obvious integration gotchas

- A caller must register (via `_initialize_access_control` or the frontend
  sign-in) before any guarded call; an unregistered signed-in caller traps with
  `User is not registered` rather than receiving a graceful denial.
- `deleteVideo` is a soft delete: the video row remains in storage with status
  `#deleted` and is simply excluded from feeds and `getVideo` for non-owners.
- `uploadChunk` ignores `chunkIndex`; the byte accounting is purely additive,
  so duplicate chunks corrupt the byte count (see Mutation retry safety).
- `getVideo` returns `null` for a non-published video unless the caller is its
  owner, so a draft is invisible to everyone but its owner.
- OQL `schema()` and `execute()` honour per-entity authorization: public
  entities (`user`, `video`) are readable by anyone including anonymous
  callers, while per-user entities (`uploadSession`, `subscription`,
  `notification`) are scoped so each signed-in caller reads only its own rows.
"
  };
};
