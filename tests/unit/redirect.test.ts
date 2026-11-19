import { describe, expect, it } from "vitest";

import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath (open-redirect protection)", () => {
  it("allows internal paths, keeping query and hash", () => {
    expect(safeRedirectPath("/app/trades")).toBe("/app/trades");
    expect(safeRedirectPath("/app/trades?page=2#top")).toBe("/app/trades?page=2#top");
  });

  it.each([
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript: URL", "javascript:alert(1)"],
    ["relative without slash", "app/trades"],
    ["tab injection", "/\t/evil.example"],
    ["newline injection", "/\n/evil.example"],
    ["empty", ""],
  ])("rejects %s", (_name, input) => {
    expect(safeRedirectPath(input)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("falls back for null/undefined", () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("normalises dot segments without escaping the site", () => {
    expect(safeRedirectPath("/app/../../etc")).toBe("/etc");
  });
});
