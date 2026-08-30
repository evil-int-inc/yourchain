import { cn } from "@/lib/utils";
import { useAuth } from "@/services/hooks";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Clapperboard,
  Home,
  type LucideIcon,
  Upload,
  User,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Path prefix used to decide the active state. */
  match: string;
}

/**
 * Shared navigation items used by the desktop sidebar rail and the mobile
 * top nav. The "Your channel" target is resolved per-render from the caller's
 * profile id.
 */
export function useNavItems(): NavItem[] {
  const { profile } = useAuth();
  const channelPath = profile
    ? `/channel/${profile.id.toString()}`
    : "/channel/me";

  return [
    { label: "Home", to: "/", icon: Home, match: "/" },
    { label: "Feed", to: "/feed", icon: Clapperboard, match: "/feed" },
    {
      label: "Subscriptions",
      to: "/subscriptions",
      icon: Users,
      match: "/subscriptions",
    },
    { label: "Your channel", to: channelPath, icon: User, match: "/channel" },
    { label: "Upload", to: "/upload", icon: Upload, match: "/upload" },
  ];
}

function isActive(pathname: string, match: string): boolean {
  if (match === "/") return pathname === "/";
  return pathname === match || pathname.startsWith(`${match}/`);
}

/**
 * Narrow icon rail sidebar. Hidden on mobile (the MainLayout renders a top
 * nav there instead). Active items use the crimson-red accent.
 */
export function Sidebar() {
  const navItems = useNavItems();
  const { pathname } = useLocation();

  return (
    <aside
      data-ocid="sidebar"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-4 lg:flex"
    >
      <nav
        aria-label="Primary"
        className="flex w-full flex-col items-center gap-1"
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item.match);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              data-ocid="sidebar_link"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary"
                  aria-hidden="true"
                />
              ) : null}
              <Icon
                className={cn(
                  "size-5 transition-transform group-hover:scale-110",
                  active && "text-primary",
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
