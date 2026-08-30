import type { Backend } from "@/backend";
import type { User } from "@/types";

/**
 * Fetches the authenticated caller's profile (channel).
 *
 * Returns `null` when the caller has not created a profile yet.
 */
export function getCallerProfile(actor: Backend): Promise<User | null> {
  return actor.getCallerProfile();
}
