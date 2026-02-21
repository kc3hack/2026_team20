import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  }),
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
  Toaster: () => null,
}));

import { AuthProvider, useAuth } from "../AuthProvider";

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user ? auth.user.displayName : "null"}</span>
      <button type="button" onClick={() => auth.signInWithGitHub()} data-testid="github-btn">
        GitHub
      </button>
      <button type="button" onClick={() => auth.signInWithGoogle()} data-testid="google-btn">
        Google
      </button>
      <button
        type="button"
        onClick={() => auth.signInWithGitHub("/plots/new")}
        data-testid="github-redirect-btn"
      >
        GitHub with redirect
      </button>
      <button
        type="button"
        onClick={() => auth.signInWithGoogle("/dashboard")}
        data-testid="google-redirect-btn"
      >
        Google with redirect
      </button>
      <button type="button" onClick={auth.signOut} data-testid="signout-btn">
        SignOut
      </button>
      <button type="button" onClick={auth.handleUnauthorized} data-testid="unauthorized-btn">
        401
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  let authStateCallback: (event: string, session: unknown) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      callback("INITIAL_SESSION", null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with isLoading: true initially", () => {
    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("onAuthStateChange updates user state", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    const fakeSession = {
      user: {
        id: "user-1",
        email: "taro@example.com",
        user_metadata: {
          full_name: "太郎",
          avatar_url: "https://example.com/avatar.png",
        },
        created_at: "2026-01-01T00:00:00Z",
      },
      access_token: "token-abc",
    };

    act(() => {
      authStateCallback("SIGNED_IN", fakeSession);
    });

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("太郎");
    });
  });

  it("signInWithGitHub calls Supabase OAuth", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("github-btn").click();

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "github" }),
      );
    });
  });

  it("signInWithGoogle calls Supabase OAuth", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("google-btn").click();

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" }),
      );
    });
  });

  it("signOut clears session", async () => {
    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      callback("INITIAL_SESSION", {
        user: {
          id: "user-1",
          email: "taro@example.com",
          user_metadata: { full_name: "太郎" },
          created_at: "2026-01-01T00:00:00Z",
        },
        access_token: "token",
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    screen.getByTestId("signout-btn").click();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("401 callback triggers toast and clears session", async () => {
    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      callback("INITIAL_SESSION", {
        user: {
          id: "user-1",
          email: "taro@example.com",
          user_metadata: { full_name: "太郎" },
          created_at: "2026-01-01T00:00:00Z",
        },
        access_token: "token",
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      screen.getByTestId("unauthorized-btn").click();
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "セッションが切れました。再度ログインしてください。",
      );
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("null");
    });
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");
    consoleError.mockRestore();
  });

  it("signInWithGitHub shows toast on error", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: "OAuth error" },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("github-btn").click();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("GitHub ログインに失敗しました: OAuth error");
    });
  });

  it("signInWithGoogle shows toast on error", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: "OAuth error" },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("google-btn").click();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Google ログインに失敗しました: OAuth error");
    });
  });

  it("handleUnauthorized shows additional toast when signOut fails", async () => {
    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      callback("INITIAL_SESSION", {
        user: {
          id: "user-1",
          email: "taro@example.com",
          user_metadata: { full_name: "太郎" },
          created_at: "2026-01-01T00:00:00Z",
        },
        access_token: "token",
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      screen.getByTestId("unauthorized-btn").click();
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "セッションが切れました。再度ログインしてください。",
      );
      expect(mockToastError).toHaveBeenCalledWith("ログアウト処理に失敗しました: Sign out failed");
    });
  });

  it("handleUnauthorized shows toast when signOut throws exception", async () => {
    mockOnAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      callback("INITIAL_SESSION", {
        user: {
          id: "user-1",
          email: "taro@example.com",
          user_metadata: { full_name: "太郎" },
          created_at: "2026-01-01T00:00:00Z",
        },
        access_token: "token",
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockSignOut.mockRejectedValue(new Error("Network failure"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });

    await act(async () => {
      screen.getByTestId("unauthorized-btn").click();
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "セッションが切れました。再度ログインしてください。",
      );
      expect(mockToastError).toHaveBeenCalledWith("ログアウト処理中にエラーが発生しました");
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("null");
    });
  });

  it("signInWithGitHub passes redirectTo as redirectTo param in callback URL", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("github-redirect-btn").click();

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "github",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("redirectTo=%2Fplots%2Fnew"),
          }),
        }),
      );
    });
  });

  it("signInWithGoogle passes redirectTo as redirectTo param in callback URL", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("google-redirect-btn").click();

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("redirectTo=%2Fdashboard"),
          }),
        }),
      );
    });
  });

  it("signInWithGitHub without redirectTo uses callback URL without redirectTo param", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    screen.getByTestId("github-btn").click();

    await waitFor(() => {
      const callArg = mockSignInWithOAuth.mock.calls[0][0];
      expect(callArg.provider).toBe("github");
      expect(callArg.options.redirectTo).toContain("/auth/callback");
      expect(callArg.options.redirectTo).not.toContain("redirectTo=");
    });
  });
});
