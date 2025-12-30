import { describe, expect, it } from "bun:test";
import app from "../index";

describe("Auth Login", () => {
  const mockEnv = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
          raw: async () => [],
        }),
      }),
    } as unknown as D1Database,
  };

  it("should return 400 for non-existent user", async () => {
    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );
    expect(res.status).toBe(400);
  });
});
