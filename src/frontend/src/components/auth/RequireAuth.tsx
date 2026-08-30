import { useAuth } from "@/services/hooks";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Guards a route behind authentication. While the identity is initializing it
 * shows a loading state; when the user is anonymous it triggers sign-in and
 * shows a loading state; otherwise it renders the protected content.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, login } = useAuth();

  if (isInitializing) {
    return (
      <div
        data-ocid="loading_state"
        className="flex min-h-[50vh] items-center justify-center"
      >
        <Loader2
          className="size-6 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    login();
    return (
      <div
        data-ocid="loading_state"
        className="flex min-h-[50vh] items-center justify-center"
      >
        <Loader2
          className="size-6 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Signing in</span>
      </div>
    );
  }

  return <>{children}</>;
}
