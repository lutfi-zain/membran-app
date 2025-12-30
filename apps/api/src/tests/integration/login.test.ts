import { describe, expect, it } from "bun:test";
import app from "../../index";

describe("Login/Logout Integration", () => {
  it("should handle full session cycle", async () => {
    // Placeholder for session cycle test
    const res = await app.request("/auth/me");
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: unknown };
    expect(data.user).toBeNull();
  });
});
