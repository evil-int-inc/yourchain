import type { Backend } from "@/backend";
import type { User, UserId } from "@/types";

/** Input for saving a channel profile. */
export interface SaveProfileInput {
  displayName: string;
  username: string;
  avatar: string | null;
  bio: string | null;
}

/** Fetches a channel by its principal id. */
export function getChannel(
  actor: Backend,
  userId: UserId,
): Promise<User | null> {
  return actor.getChannel(userId);
}

/** Fetches a channel by its unique username. */
export function getChannelByUsername(
  actor: Backend,
  username: string,
): Promise<User | null> {
  return actor.getChannelByUsername(username);
}

/** Saves the caller's channel profile. */
export function saveProfile(
  actor: Backend,
  input: SaveProfileInput,
): Promise<User> {
  return actor.saveProfile(
    input.displayName,
    input.username,
    input.avatar,
    input.bio,
  );
}
