import type { Backend } from "@/backend";
import type { User } from "@/types";

/** Backend operations for the authenticated caller. */
export class AuthService {
  /**
   * Fetches the authenticated caller's profile (channel).
   * Returns `null` when the caller has not created a profile yet.
   */
  getCallerProfile(actor: Backend): Promise<User | null> {
    return actor.getCallerProfile();
  }
}

export const authService = new AuthService();
