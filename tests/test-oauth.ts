// Test OAuth flow with proper cookies
const response = await fetch("http://localhost:8787/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "playwright-test@example.com",
    password: "TestPass123"
  })
});

const setCookie = response.headers.get("set-cookie");
const sessionMatch = setCookie?.match(/auth_session=([^;]+)/);
const session = sessionMatch?.[1];

console.log("✅ Signed up! Session:", session?.substring(0, 20) + "...");

// Get invite URL
const inviteResponse = await fetch("http://localhost:8787/api/bot/invite", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Origin": "http://localhost:5173",
    "Cookie": `auth_session=${session}`
  }
});

const inviteData = await inviteResponse.json();
console.log("\n🔗 OAuth URL:");
console.log(inviteData.authorizationUrl);
