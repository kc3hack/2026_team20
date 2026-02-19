import { describe, expect, it } from "vitest";
import { sanitizeRedirectPath } from "../sanitizeRedirectPath";

describe("sanitizeRedirectPath", () => {
  it("returns undefined for null input (no fallback)", () => {
    expect(sanitizeRedirectPath(null)).toBeUndefined();
  });

  it("returns undefined for empty string (no fallback)", () => {
    expect(sanitizeRedirectPath("")).toBeUndefined();
  });

  it("returns fallback for null input", () => {
    expect(sanitizeRedirectPath(null, "/")).toBe("/");
  });

  it("returns valid relative path", () => {
    expect(sanitizeRedirectPath("/plots/new")).toBe("/plots/new");
  });

  it("rejects absolute URL", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBeUndefined();
  });

  it("rejects protocol-relative URL", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBeUndefined();
  });

  it("rejects path with backslash", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBeUndefined();
  });

  it("rejects backslash with fallback", () => {
    expect(sanitizeRedirectPath("/\\evil.com", "/")).toBe("/");
  });

  it("returns valid path with query string", () => {
    expect(sanitizeRedirectPath("/plots/new?foo=bar")).toBe("/plots/new?foo=bar");
  });

  it("returns root path", () => {
    expect(sanitizeRedirectPath("/")).toBe("/");
  });
});
