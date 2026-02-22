import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentListResponse, CommentResponse, ThreadResponse } from "@/lib/api/types";

const mockGetComments = vi.fn();
const mockAddComment = vi.fn();
const mockCreateThread = vi.fn();

vi.mock("@/lib/api/repositories", () => ({
  snsRepository: {
    getComments: (...args: unknown[]) => mockGetComments(...args),
    addComment: (...args: unknown[]) => mockAddComment(...args),
    createThread: (...args: unknown[]) => mockCreateThread(...args),
  },
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

let mockIsAuthenticated = true;
const mockAccessToken = "test-token";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    session: mockIsAuthenticated ? { access_token: mockAccessToken } : null,
    user: mockIsAuthenticated ? { id: "user-1", displayName: "Test" } : null,
    isLoading: false,
    isAuthenticated: mockIsAuthenticated,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    handleUnauthorized: vi.fn(),
  }),
}));

import { useAddComment, useComments, useCreateThread } from "../useComments";

const mockComment: CommentResponse = {
  id: "comment-1",
  threadId: "thread-001",
  content: "テストコメント",
  parentCommentId: null,
  user: {
    id: "user-1",
    displayName: "Test User",
    avatarUrl: null,
  },
  createdAt: "2026-02-20T00:00:00Z",
};

const mockCommentListResponse: CommentListResponse = {
  items: [mockComment],
  total: 1,
};

const mockThreadResponse: ThreadResponse = {
  id: "thread-new",
  plotId: "plot-1",
  sectionId: null,
  commentCount: 0,
  createdAt: "2026-02-20T00:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockGetComments.mockResolvedValue(mockCommentListResponse);
    mockAddComment.mockResolvedValue(mockComment);
    mockCreateThread.mockResolvedValue(mockThreadResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("threadId でコメント一覧が取得できる", async () => {
    const { result } = renderHook(() => useComments("thread-001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.comments).toEqual(mockCommentListResponse.items);
    expect(result.current.total).toBe(1);
    expect(mockGetComments).toHaveBeenCalledWith("thread-001", undefined, mockAccessToken);
  });

  it("threadId が空文字の場合クエリが無効", () => {
    const { result } = renderHook(() => useComments(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetComments).not.toHaveBeenCalled();
  });
});

describe("useAddComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockGetComments.mockResolvedValue(mockCommentListResponse);
    mockAddComment.mockResolvedValue(mockComment);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("投稿成功で toast.success が呼ばれる", async () => {
    const { result } = renderHook(() => useAddComment("thread-001"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addComment("テストコメント");
    });

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith(
        "thread-001",
        { content: "テストコメント", parentCommentId: undefined },
        mockAccessToken,
      );
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("コメントを投稿しました");
    });
  });

  it("parentCommentId 付きで投稿できる", async () => {
    const { result } = renderHook(() => useAddComment("thread-001"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addComment("返信コメント", "parent-1");
    });

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith(
        "thread-001",
        { content: "返信コメント", parentCommentId: "parent-1" },
        mockAccessToken,
      );
    });
  });

  it("未ログインで addComment → API は呼ばれずリダイレクト", () => {
    mockIsAuthenticated = false;

    const { result } = renderHook(() => useAddComment("thread-001"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addComment("テスト");
    });

    expect(mockAddComment).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=%2F");
  });
});

describe("useCreateThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockCreateThread.mockResolvedValue(mockThreadResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("スレッド作成成功で ThreadResponse が返される", async () => {
    const { result } = renderHook(() => useCreateThread(), {
      wrapper: createWrapper(),
    });

    let threadResult: ThreadResponse | undefined;

    await act(async () => {
      threadResult = await result.current.createThread("plot-1");
    });

    expect(threadResult).toEqual(mockThreadResponse);
    expect(mockCreateThread).toHaveBeenCalledWith({ plotId: "plot-1" }, mockAccessToken);
  });
});
