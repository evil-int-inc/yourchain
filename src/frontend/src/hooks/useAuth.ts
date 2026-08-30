import { createActor } from "@/backend";
import { getCallerProfile } from "@/services/auth";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

/**
 * Authentication + caller profile hook.
 *
 * Wraps Internet Identity state and exposes the authenticated caller's
 * principal and profile (channel) when signed in.
 */
export function useAuth() {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
  } = useInternetIdentity();

  const { actor, isFetching } = useActor(createActor);

  const principal = identity?.getPrincipal().toString() ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!actor) return null;
      return getCallerProfile(actor);
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  return {
    identity,
    principal,
    login,
    logout: clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    profile: profileQuery.data ?? null,
    profileLoading: profileQuery.isLoading,
  };
}
