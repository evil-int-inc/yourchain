import { Header } from "@/components/layout/Header";
import { Sidebar, useNavItems } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { Link, Outlet, useLocation } from "@tanstack/react-router";

function isActive(pathname: string, match: string): boolean {
  if (match === "/") return pathname === "/";
  return pathname === match || pathname.startsWith(`${match}/`);
}

/**
 * Mobile top navigation rail. Uses the same nav items as the desktop sidebar
 * so both surfaces stay in sync.
 */
function MobileNav() {
  const navItems = useNavItems();
  const { pathname } = useLocation();

  return (
    <nav
      data-ocid="mobile_nav"
      aria-label="Primary"
      className="sticky top-16 z-30 flex items-center justify-around border-b border-border bg-card px-2 py-1 lg:hidden"
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            data-ocid="mobile_nav_link"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * App shell: sticky header, desktop icon-rail sidebar, mobile top nav, and the
 * routed page content.
 */
export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Header />
      <MobileNav />
      <div className="flex flex-1">
        <Sidebar />
        <main data-ocid="main_content" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
