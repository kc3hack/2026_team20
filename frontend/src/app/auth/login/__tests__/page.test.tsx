import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
  Toaster: () => null,
}));

vi.mock("@/components/auth/LoginButton/LoginButton", () => ({
  LoginButton: ({ provider, redirectTo }: { provider: string; redirectTo?: string }) => (
    <button type="button" data-testid={`login-${provider}`} data-redirect-to={redirectTo ?? ""}>
      {provider}
    </button>
  ),
}));

import LoginPage from "../page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("next");
    mockSearchParams.delete("error");
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("next パラメータがある場合、LoginButton に redirectTo が渡される", () => {
    mockSearchParams.set("next", "/plots/new");

    render(<LoginPage />);

    const githubBtn = screen.getByTestId("login-github");
    expect(githubBtn.getAttribute("data-redirect-to")).toBe("/plots/new");
    const googleBtn = screen.getByTestId("login-google");
    expect(googleBtn.getAttribute("data-redirect-to")).toBe("/plots/new");
  });

  it("next パラメータがない場合、LoginButton に redirectTo が undefined", () => {
    render(<LoginPage />);

    const githubBtn = screen.getByTestId("login-github");
    expect(githubBtn.getAttribute("data-redirect-to")).toBe("");
  });

  it("next パラメータが外部 URL（http://evil.com）の場合、無視される", () => {
    mockSearchParams.set("next", "http://evil.com");

    render(<LoginPage />);

    const githubBtn = screen.getByTestId("login-github");
    expect(githubBtn.getAttribute("data-redirect-to")).toBe("");
  });

  it('next パラメータが "//" で始まる場合、無視される', () => {
    mockSearchParams.set("next", "//evil.com");

    render(<LoginPage />);

    const githubBtn = screen.getByTestId("login-github");
    expect(githubBtn.getAttribute("data-redirect-to")).toBe("");
  });

  it("error パラメータがある場合、toast.error が呼ばれる", () => {
    mockSearchParams.set("error", "auth_callback_error");

    render(<LoginPage />);

    expect(mockToastError).toHaveBeenCalledWith("ログインに失敗しました。もう一度お試しください。");
  });

  it("認証済みの場合、/ にリダイレクトされる", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    render(<LoginPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("isLoading 中はローディング UI が表示される", () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

    render(<LoginPage />);

    expect(screen.queryByTestId("login-github")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-google")).not.toBeInTheDocument();
  });
});
