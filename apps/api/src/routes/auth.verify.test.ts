import { describe, expect, it } from "bun:test";
import { generateVerificationToken, hashToken } from "../lib/auth";
import app from "../index";

describe("Verification Token Utility", () => {
  it("should generate a unique token of correct length", () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(32);
  });

  it("should hash a token consistently", async () => {
    const token = "test-token-123";
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different tokens", async () => {
    const token1 = "token-1";
    const token2 = "token-2";
    const hash1 = await hashToken(token1);
    const hash2 = await hashToken(token2);
    expect(hash1).not.toBe(hash2);
  });
});

describe("Auth Verification Endpoint", () => {
  it("should return 302 and redirect with error for missing token", async () => {
    const res = await app.request("/auth/verify", {
      method: "GET",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("error=invalid_token");
  });
});
