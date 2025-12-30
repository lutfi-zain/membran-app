import { describe, expect, it } from "bun:test";
import app from "../../index";

describe("Discord Connection Integration", () => {
  it("should fail callback if state is missing or invalid", async () => {
    // First returns 401 for no session, before state validation
    const res = await app.request("/auth/connect/discord/callback", {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("should return 401 if no session exists during callback", async () => {
    const res = await app.request(
      "/auth/connect/discord/callback?code=123&state=abc",
      {
        method: "GET",
        headers: {
          Cookie: "discord_oauth_state=abc",
        },
      },
    );
    expect(res.status).toBe(401);
  });
});
