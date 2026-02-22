import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockPathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname(),
}));

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AuthGuard } from "../AuthGuard";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/protected");
  });

  afterEach(() => {
    cleanup();
  });

  it("isLoading: true の場合、デフォルト fallback を表示する", () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("isLoading: true でカスタム fallback が渡された場合、それを表示する", () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

    render(
      <AuthGuard fallback={<div>Loading custom...</div>}>
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Loading custom...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("isAuthenticated: false の場合、/auth/login にリダイレクトする", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    mockPathname.mockReturnValue("/protected");

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/auth/login?redirectTo=%2Fprotected");
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("isAuthenticated: false の場合、現在のパスを redirectTo パラメータとして含める", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    mockPathname.mockReturnValue("/plots/new");

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/auth/login?redirectTo=%2Fplots%2Fnew");
  });

  it("isAuthenticated: false でカスタム redirectTo が渡された場合、そこにリダイレクトする", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    mockPathname.mockReturnValue("/protected");

    render(
      <AuthGuard redirectTo="/custom-login">
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/custom-login?redirectTo=%2Fprotected");
  });

  it("isAuthenticated: true の場合、children を表示する", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
