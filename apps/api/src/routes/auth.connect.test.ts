import { describe, expect, it } from "bun:test";
import app from "../index";

describe("Discord Connection", () => {
  it("should return 401 for unauthenticated users", async () => {
    const res = await app.request("/auth/connect/discord", {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("should return 401 for callback without session", async () => {
    const res = await app.request("/auth/connect/discord/callback?code=test&state=test", {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("should return 400 for callback with invalid state", async () => {
    const res = await app.request(
      "/auth/connect/discord/callback?code=test&state=test",
      {
        method: "GET",
        headers: {
          Cookie: "auth_session=valid-session; discord_oauth_state=different",
        },
      },
    );
    expect(res.status).toBe(400);
  });
});
