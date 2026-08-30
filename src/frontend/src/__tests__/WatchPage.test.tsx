import { ExternalBlob } from "@/backend";
import { WatchPage } from "@/pages/WatchPage";
import { VideoStatus } from "@/types";
import type { Video } from "@/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the actor infrastructure and auth hooks.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: {}, isFetching: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ principal: null }),
}));

// The SubscribeButton pulls in useSubscription, which needs the full
// react-query + actor stack. Stub it so the watch page renders cleanly.
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isSubscribed: false,
    subscriberCount: 0n,
    isPending: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

// Mock the router hooks used by the watch page.
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ videoId: "1" }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

// Mock the storage service so no network/asset calls happen.
vi.mock("@/services/storage", () => ({
  storageService: {
    getDirectURL: vi.fn(async () => "https://example.com/asset"),
  },
}));

// Mock react-query's useQuery to control the video and channel data.
const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

function makePublishedVideo(): Video {
  return {
    id: 1n,
    title: "My published clip",
    status: VideoStatus.published,
    ownerId: "aaaaa-aa" as unknown as Video["ownerId"],
    createdAt: 0n,
    publishedAt: 1n,
    video: ExternalBlob.fromURL("https://example.com/video"),
    filename: "clip.mp4",
    mimeType: "video/mp4",
    fileSize: 100n,
    isPrivate: false,
    description: "A great description",
  };
}

describe("WatchPage", () => {
  it("renders a published video with its title, description, and player", async () => {
    const video = makePublishedVideo();
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey[0] === "video") {
        return {
          data: video,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      // channel query
      return {
        data: { displayName: "Ada", username: "ada", createdAt: 0n },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });

    render(<WatchPage />);

    expect(await screen.findByText("My published clip")).toBeInTheDocument();
    expect(screen.getByText("A great description")).toBeInTheDocument();
    expect(screen.getByTestId("video_element")).toHaveAttribute(
      "src",
      "https://example.com/video",
    );
  });

  it("shows an unavailable state for a non-published video", async () => {
    const draft = { ...makePublishedVideo(), status: VideoStatus.draft };
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey[0] === "video") {
        return {
          data: draft,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return { data: null, isLoading: false, isError: false, refetch: vi.fn() };
    });

    render(<WatchPage />);

    expect(await screen.findByText("Video unavailable")).toBeInTheDocument();
  });

  it("renders a missing profile as an unclickable Anonymous channel", async () => {
    const video = makePublishedVideo();
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey[0] === "video") {
        return {
          data: video,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return { data: null, isLoading: false, isError: false, refetch: vi.fn() };
    });

    render(<WatchPage />);

    expect(await screen.findByTestId("anonymous_channel")).toHaveTextContent(
      "Anonymous",
    );
    expect(screen.queryByTestId("channel_link")).not.toBeInTheDocument();
    expect(screen.queryByText("Subscribe")).not.toBeInTheDocument();
  });
});
