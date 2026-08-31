import { ExternalBlob } from "@/backend";
import { ChannelPage } from "@/pages/ChannelPage";
import { VideoStatus } from "@/types";
import type { Video } from "@/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: {}, isFetching: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ principal: null }),
}));

// The SubscribeButton pulls in useSubscription, which needs the full
// react-query + actor stack. Stub it so the channel page renders cleanly.
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isSubscribed: false,
    subscriberCount: 0n,
    isPending: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ userId: "aaaaa-aa" }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

// Mock the infinite-scroll hook to control the channel's video list.
const useInfiniteVideosMock = vi.fn();
vi.mock("@/hooks/useInfiniteVideos", () => ({
  useInfiniteVideos: (options: unknown) => useInfiniteVideosMock(options),
}));

function makeVideo(id: bigint, title: string): Video {
  return {
    id,
    title,
    status: VideoStatus.published,
    ownerId: "aaaaa-aa" as unknown as Video["ownerId"],
    createdAt: 0n,
    publishedAt: 1n,
    video: ExternalBlob.fromURL(`https://example.com/video-${id}`),
    filename: `video-${id}.mp4`,
    mimeType: "video/mp4",
    fileSize: 100n,
    viewCount: 0n,
    isPrivate: false,
  };
}

describe("ChannelPage", () => {
  it("renders the channel header and its published videos", async () => {
    useQueryMock.mockReturnValue({
      data: {
        displayName: "Ada",
        username: "ada",
        bio: "Hello",
        createdAt: 0n,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    useInfiniteVideosMock.mockReturnValue({
      items: [makeVideo(2n, "Second"), makeVideo(1n, "First")],
      hasMore: false,
      loadMore: vi.fn(),
      reset: vi.fn(),
      isLoading: false,
      error: null,
      sentinelRef: { current: null },
    });

    render(<ChannelPage />);

    expect(
      await screen.findByRole("heading", { name: "Ada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("@ada")),
    ).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("shows an empty state when the channel has no videos", async () => {
    useQueryMock.mockReturnValue({
      data: { displayName: "Ada", username: "ada", createdAt: 0n },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    useInfiniteVideosMock.mockReturnValue({
      items: [],
      hasMore: false,
      loadMore: vi.fn(),
      reset: vi.fn(),
      isLoading: false,
      error: null,
      sentinelRef: { current: null },
    });

    render(<ChannelPage />);

    expect(await screen.findByText("No videos yet")).toBeInTheDocument();
  });
});
