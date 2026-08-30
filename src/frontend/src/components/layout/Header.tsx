import { NotificationBell } from "@/components/common/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/services/hooks";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Play, Search, Upload, User } from "lucide-react";
import { useState } from "react";

/**
 * Sticky top header. Shows the YourChain wordmark, a pill search input, an
 * upload action, the notification bell, and a sign-in button or avatar menu
 * depending on auth state.
 */
export function Header() {
  const { isAuthenticated, isInitializing, login, logout, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    void navigate({ to: "/feed", search: { q: term } });
    setQuery("");
  }

  const displayName =
    profile?.displayName ?? profile?.username ?? "Your channel";

  return (
    <header
      data-ocid="header"
      className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-3 shadow-subtle sm:px-4"
    >
      {/* Wordmark */}
      <Link
        to="/feed"
        data-ocid="brand_link"
        aria-label="YourChain home"
        className="flex shrink-0 items-center gap-2"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Play className="size-4 fill-current" aria-hidden="true" />
        </span>
        <span className="hidden font-display text-lg font-bold tracking-tight text-foreground sm:inline">
          Your<span className="text-primary">Chain</span>
        </span>
      </Link>

      {/* Search */}
      <form
        onSubmit={submitSearch}
        className="mx-auto flex w-full max-w-xl items-center"
      >
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos"
            aria-label="Search videos"
            data-ocid="search_input"
            className="input input-bordered h-10 w-full rounded-full border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/upload"
          data-ocid="upload_button"
          aria-label="Upload video"
          className="btn btn-ghost btn-square btn-sm hidden sm:inline-flex"
        >
          <Upload className="size-5" aria-hidden="true" />
        </Link>

        <Button variant="primary" size="sm" className="hidden md:inline-flex">
          <Link
            to="/upload"
            data-ocid="upload_button"
            className="inline-flex items-center gap-1.5"
          >
            <Upload className="size-4" aria-hidden="true" />
            Upload
          </Link>
        </Button>

        <NotificationBell />

        {isInitializing ? (
          <div
            className="size-9 animate-pulse rounded-full bg-muted"
            aria-hidden="true"
          />
        ) : isAuthenticated ? (
          <div className="dropdown dropdown-end">
            <button
              type="button"
              data-ocid="avatar_menu_button"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="btn btn-ghost btn-circle"
            >
              <Avatar name={displayName} size="sm" />
            </button>
            <div
              data-ocid="avatar_menu"
              className={cn(
                "dropdown-content z-50 mt-2 w-56 rounded-box border border-border bg-popover p-1 shadow-elevated",
                menuOpen && "dropdown-open",
              )}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.username ?? "Your channel"}
                </p>
              </div>
              <Link
                to="/profile"
                data-ocid="profile_link"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="size-4" aria-hidden="true" />
                Your profile
              </Link>
              <button
                type="button"
                data-ocid="logout_button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => login()}
            data-ocid="sign_in_button"
          >
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
