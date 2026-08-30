import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Clapperboard,
  LogIn,
  LogOut,
  type LucideIcon,
  Play,
  Upload,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { MouseEvent } from "react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  match: string;
  requiresAuth?: boolean;
}

export function useNavItems(): NavItem[] {
  const { profile } = useAuth();
  const channelPath = profile
    ? `/channel/${profile.id.toString()}`
    : "/profile";

  return [
    { label: "Feed", to: "/feed", icon: Clapperboard, match: "/feed" },
    {
      label: "Subscriptions",
      to: "/subscriptions",
      icon: Users,
      match: "/subscriptions",
    },
    {
      label: "Upload video",
      to: "/upload",
      icon: Upload,
      match: "/upload",
      requiresAuth: true,
    },
    {
      label: "Your channel",
      to: channelPath,
      icon: User,
      match: "/channel",
      requiresAuth: true,
    },
    {
      label: "Profile settings",
      to: "/profile",
      icon: UserCog,
      match: "/profile",
      requiresAuth: true,
    },
  ];
}

function isActive(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}

interface SidebarProps {
  onNavigate: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const navItems = useNavItems();
  const { pathname } = useLocation();
  const { isAuthenticated, isInitializing, login, logout } = useAuth();

  function handleProtectedNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    requiresAuth?: boolean,
  ) {
    if (!requiresAuth || isAuthenticated) {
      onNavigate();
      return;
    }

    event.preventDefault();
    if (!isInitializing) login();
    onNavigate();
  }

  return (
    <aside
      data-ocid="sidebar"
      className="flex min-h-full w-64 flex-col border-r border-base-300 bg-base-100"
    >
      <div className="flex h-16 items-center justify-between border-b border-base-300 px-4">
        <Link
          to="/feed"
          onClick={onNavigate}
          aria-label="YourChain home"
          className="flex items-center gap-2"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-info text-info-content">
            <Play className="size-5 fill-current" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Your<span className="text-info">Chain</span>
          </span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm lg:hidden"
          onClick={onNavigate}
          aria-label="Close sidebar"
          data-ocid="layout.sidebar_close"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 p-3" aria-label="Primary">
        <ul className="menu menu-lg w-full gap-1 p-0">
          {navItems.map((item) => {
            const active = isActive(pathname, item.match);
            const Icon = item.icon;

            return (
              <li key={`${item.label}-${item.to}`}>
                <Link
                  to={item.to}
                  data-ocid="sidebar_link"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3",
                    active && "menu-active",
                  )}
                  onClick={(event) =>
                    handleProtectedNavigation(event, item.requiresAuth)
                  }
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.requiresAuth && !isAuthenticated ? (
                    <LogIn className="size-3.5 opacity-40" aria-hidden="true" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-base-300 p-4">
        {isAuthenticated ? (
          <button
            type="button"
            className="btn btn-neutral btn-sm w-full gap-2"
            onClick={() => {
              logout();
              onNavigate();
            }}
            disabled={isInitializing}
            data-ocid="layout.sidebar_logout"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-neutral btn-sm w-full gap-2"
            onClick={() => {
              login();
              onNavigate();
            }}
            disabled={isInitializing}
            data-ocid="layout.sidebar_login"
          >
            {isInitializing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <LogIn className="size-4" aria-hidden="true" />
            )}
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}
