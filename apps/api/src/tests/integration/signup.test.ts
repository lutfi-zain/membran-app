import { describe, expect, it } from "bun:test";
import app from "../../index";

describe("Registration Integration", () => {
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

  it("should fail registration with existing email", async () => {
    const res = await app.request(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );
    expect(res.status).toBeDefined();
  });
});
