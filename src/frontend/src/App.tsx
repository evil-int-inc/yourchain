import { RequireAuth } from "@/components/auth/RequireAuth";
import { MainLayout } from "@/layouts/MainLayout";
import { ChannelPage } from "@/pages/ChannelPage";
import { FeedPage } from "@/pages/FeedPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SubscriptionsPage } from "@/pages/SubscriptionsPage";
import { UploadPage } from "@/pages/UploadPage";
import { WatchPage } from "@/pages/WatchPage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: MainLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/feed" });
  },
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feed",
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q : undefined;
    return q === undefined ? {} : { q };
  },
  component: FeedPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: () => (
    <RequireAuth>
      <UploadPage />
    </RequireAuth>
  ),
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch/$videoId",
  component: WatchPage,
});

const channelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channel/$userId",
  component: ChannelPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  feedRoute,
  subscriptionsRoute,
  uploadRoute,
  watchRoute,
  channelRoute,
  profileRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
