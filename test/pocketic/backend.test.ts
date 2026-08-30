import { createIdentity, PocketIc } from "@dfinity/pic";
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
let actor: _SERVICE;

// Runs the full upload pipeline as `owner` and returns the published video.
// Each test seeds its own data so no test depends on another's side effects.
async function publishVideo(owner: typeof alice, title: string, size: number) {
  actor.setPrincipal(owner);
  const session = await actor.createUploadSession({ video: null }, BigInt(size), "video/mp4");
  await actor.uploadChunk(session.id, 0n, new Uint8Array(size));
  await actor.verifyUpload(session.id);
  const draft = await actor.finalizeMedia(session.id, title, [], []);
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

  it("runs the full upload flow and surfaces the published video in feeds", async () => {
    actor.setPrincipal(alice);

    // createUploadSession → uploadChunk → verifyUpload → finalizeMedia → publishVideo
    const session = await actor.createUploadSession({ video: null }, 100n, "video/mp4");
    expect(session.status).toEqual({ active: null });
    expect(session.totalSize).toBe(100n);
    expect(session.ownerId).toEqual(alice);

    const received = await actor.uploadChunk(session.id, 0n, new Uint8Array(100));
    expect(received).toBe(100n);

    await actor.verifyUpload(session.id);

    const draft = await actor.finalizeMedia(session.id, "My clip", ["A description"], []);
    expect(draft.status).toEqual({ draft: null });
    expect(draft.title).toBe("My clip");
    expect(draft.ownerId).toEqual(alice);

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

  it("isolates upload sessions by owner", async () => {
    actor.setPrincipal(alice);
    const session = await actor.createUploadSession({ video: null }, 50n, "video/mp4");

    // bob does not own alice's session and cannot upload to it.
    actor.setPrincipal(bob);
    await expect(actor.uploadChunk(session.id, 0n, new Uint8Array(10))).rejects.toThrow(
      /Not the session owner/,
    );
  });
});
