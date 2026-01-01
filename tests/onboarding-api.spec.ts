import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8787";

test.describe("Onboarding API", () => {
  let sessionCookie: string;
  let userId: string;

  // Setup: Create a new user for each run
  test.beforeAll(async () => {
    const email = `onboarding-test-${Date.now()}@example.com`;
    const password = "TestPass123";

    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(response.ok).toBeTruthy();
    const data = await response.json();
    userId = data.userId;

    const setCookieHeader = response.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    if (match) {
      sessionCookie = match[1];
    }
  });

  test("should fetch initial onboarding state (auto-created)", async () => {
    const response = await fetch(`${API_BASE}/api/onboarding/state`, {
      headers: {
        Cookie: `auth_session=${sessionCookie}`,
      },
    });

    expect(response.ok).toBeTruthy();
    const state = await response.json();

    expect(state.userId).toBe(userId);
    expect(state.botConnected).toBe(false);
    expect(state.pricingConfigured).toBe(false);
    expect(state.completedAt).toBeNull();
  });

  test("should update onboarding state (bot connected)", async () => {
    const response = await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({
        botConnected: true,
      }),
    });

    expect(response.ok).toBeTruthy();
    const state = await response.json();

    expect(state.userId).toBe(userId);
    expect(state.botConnected).toBe(true);
    expect(state.pricingConfigured).toBe(false);
  });

  test("should update onboarding state (pricing configured)", async () => {
    const response = await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({
        pricingConfigured: true,
      }),
    });

    expect(response.ok).toBeTruthy();
    const state = await response.json();

    expect(state.userId).toBe(userId);
    expect(state.botConnected).toBe(true); // Should persist from previous test
    expect(state.pricingConfigured).toBe(true);
  });

  test("should fail to complete onboarding if incomplete", async () => {
    // Create a NEW user for this specific test case to ensure clean state
    const email = `incomplete-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const tempSessionCookie = match ? match[1] : "";

    const response = await fetch(`${API_BASE}/api/onboarding/complete`, {
      method: "POST",
      headers: {
        Cookie: `auth_session=${tempSessionCookie}`,
      },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("ONBOARDING_INCOMPLETE");
  });

  test("should complete onboarding when both steps are done", async () => {
    // We already set both to true in previous tests for the main user
    const response = await fetch(`${API_BASE}/api/onboarding/complete`, {
      method: "POST",
      headers: {
        Cookie: `auth_session=${sessionCookie}`,
      },
    });

    expect(response.ok).toBeTruthy();
    const state = await response.json();

    expect(state.completedAt).not.toBeNull();
    expect(typeof state.completedAt).toBe("number");
  });

  test("should reject unauthorized requests", async () => {
    const response = await fetch(`${API_BASE}/api/onboarding/state`, {
      headers: {
        // No cookie
      },
    });

    expect(response.status).toBe(401);
  });
});
