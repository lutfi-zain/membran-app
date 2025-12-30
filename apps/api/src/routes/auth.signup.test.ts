import { describe, expect, it } from "bun:test";
import app from "../index";

describe("Auth Signup", () => {
  it("should return 400 for invalid email", async () => {
    const res = await app.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "invalid", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("should return 400 for short password", async () => {
    const res = await app.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "short" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});
