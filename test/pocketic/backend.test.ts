import { type Actor, createIdentity, PocketIc } from "@dfinity/pic";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

// Two distinct signed-in principals. The first caller to register via
// `_initialize_access_control` becomes admin; every subsequent caller becomes
// user. Admin passes every permission check, so alice drives the upload flow
// while bob (a plain user) exercises subscriptions and caller isolation.
const alice = createIdentity("alice").getPrincipal();
const bob = createIdentity("bob").getPrincipal();

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;

// Creates an immutable storage reference and publishes the video as `owner`.
async function publishVideo(
  owner: typeof alice,
  title: string,
  size: number,
  isPrivate = false,
) {
  actor.setPrincipal(owner);
  const draft = await actor.createVideo(
    title,
    [],
    new Uint8Array([1, 2, 3]),
    [],
    "clip.mp4",
    "video/mp4",
    BigInt(size),
    isPrivate,
  );
  return actor.publishVideo(draft.id);
}

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor } = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BACKEND_WASM }));

  // Register both callers so role-guarded methods do not trap with
  // "User is not registered". alice (first) becomes admin, bob becomes user.
  actor.setPrincipal(alice);
  await actor._initialize_access_control();
  actor.setPrincipal(bob);
  await actor._initialize_access_control();
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

describe("YourChain backend", () => {
  it("answers an empty feed read instead of trapping", async () => {
    actor.setPrincipal(alice);
    const page = await actor.getFeed(0n, 10n);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toEqual([]);
  });

  it("stores uploaded avatars and can explicitly remove them", async () => {
    actor.setPrincipal(alice);
    const created = await actor.saveProfile(
      "Alice",
      "alice",
      [new Uint8Array([9, 8, 7])],
      false,
      ["Creator"],
    );
    expect(created.avatar).toEqual([new Uint8Array([9, 8, 7])]);

    const retained = await actor.saveProfile(
      "Alice",
      "alice",
      [],
      false,
      ["Updated"],
    );
    expect(retained.avatar).toEqual([new Uint8Array([9, 8, 7])]);

    const removed = await actor.saveProfile(
      "Alice",
      "alice",
      [],
      true,
      ["Updated"],
    );
    expect(removed.avatar).toEqual([]);
  });

  it("creates a stored video reference and surfaces the public video in feeds", async () => {
    actor.setPrincipal(alice);

    const draft = await actor.createVideo(
      "My clip",
      ["A description"],
      new Uint8Array([4, 5, 6]),
      [],
      "clip.mp4",
      "video/mp4",
      100n,
      false,
    );
    expect(draft.status).toEqual({ draft: null });
    expect(draft.title).toBe("My clip");
    expect(draft.ownerId).toEqual(alice);
    expect(draft.filename).toBe("clip.mp4");
    expect(draft.viewCount).toBe(0n);
    expect(draft.isPrivate).toBe(false);

    const published = await actor.publishVideo(draft.id);
    expect(published.status).toEqual({ published: null });
    // publishVideo records a publishedAt timestamp.
    expect(published.publishedAt.length).toBe(1);

    // Only published videos appear in the global feed.
    const feed = await actor.getFeed(0n, 10n);
    expect(feed.items).toContainEqual(
      expect.objectContaining({ id: draft.id, title: "My clip", status: { published: null } }),
    );

    // The channel page lists the owner's published videos.
    const channel = await actor.getChannelVideos(alice, 0n, 10n);
    expect(channel.items).toContainEqual(
      expect.objectContaining({ id: draft.id, ownerId: alice }),
    );

    expect(await actor.recordVideoView(draft.id)).toBe(1n);
    expect((await actor.getVideo(draft.id))[0]?.viewCount).toBe(1n);
  });

  it("supports subscribe/unsubscribe and rejects self-subscription", async () => {
    // Seed alice with a published video so the subscription feed has content.
    const aliceVideo = await publishVideo(alice, "Alice's clip", 64);

    actor.setPrincipal(bob);
    await actor.subscribe(alice);
    expect(await actor.isSubscribed(alice)).toBe(true);
    expect(await actor.getSubscribedChannels()).toContainEqual(alice);

    // A subscriber's feed includes the channel's published video.
    const subFeed = await actor.getSubscriptionFeed(0n, 10n);
    expect(subFeed.items).toContainEqual(
      expect.objectContaining({ id: aliceVideo.id, ownerId: alice }),
    );

    await actor.unsubscribe(alice);
    expect(await actor.isSubscribed(alice)).toBe(false);
    expect(await actor.getSubscribedChannels()).not.toContainEqual(alice);

    // A user cannot subscribe to themselves.
    await expect(actor.subscribe(bob)).rejects.toThrow(/Cannot subscribe to yourself/);
  });

  it("keeps private videos out of every public read and exposes them to the owner", async () => {
    actor.setPrincipal(bob);
    await actor.subscribe(alice);

    const privateVideo = await publishVideo(alice, "Alice private", 50, true);

    // Even the owner does not receive private videos through the global feed.
    const ownerFeed = await actor.getFeed(0n, 100n);
    expect(ownerFeed.items.some((video) => video.id === privateVideo.id)).toBe(false);

    actor.setPrincipal(bob);
    const feed = await actor.getFeed(0n, 100n);
    const subscriptionFeed = await actor.getSubscriptionFeed(0n, 100n);
    const channel = await actor.getChannelVideos(alice, 0n, 100n);
    expect(feed.items.some((video) => video.id === privateVideo.id)).toBe(false);
    expect(subscriptionFeed.items.some((video) => video.id === privateVideo.id)).toBe(false);
    expect(channel.items.some((video) => video.id === privateVideo.id)).toBe(false);
    expect(await actor.getVideo(privateVideo.id)).toEqual([]);
    await expect(actor.recordVideoView(privateVideo.id)).rejects.toThrow(
      /Video not available/,
    );

    const notifications = await actor.getNotifications(0n, 100n);
    expect(
      notifications.items.some(
        (notification) =>
          "newVideo" in notification.kind &&
          notification.kind.newVideo.videoId === privateVideo.id,
      ),
    ).toBe(false);

    actor.setPrincipal(alice);
    expect((await actor.getVideo(privateVideo.id))[0]?.id).toBe(privateVideo.id);
    expect(await actor.recordVideoView(privateVideo.id)).toBe(1n);
    const ownerChannel = await actor.getChannelVideos(alice, 0n, 100n);
    expect(ownerChannel.items).toContainEqual(
      expect.objectContaining({ id: privateVideo.id, isPrivate: true }),
    );

    actor.setPrincipal(bob);
    await actor.unsubscribe(alice);
  });
});
