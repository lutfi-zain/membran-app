import type React from "react";
import { useState } from "react";
import { getValidReturnUrl } from "../../lib/navigation";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const err = urlParams.get("error");
      if (err === "invalid_token")
        return "Invalid or expired verification token.";
    }
    return "";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const params = new URLSearchParams(window.location.search);
      const returnUrl = getValidReturnUrl(params);
      window.location.href = returnUrl || "/dashboard";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center">Log in to your account</h2>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Log In
        </button>
      </form>

      <div className="mt-4">
        <a
          href="/api/auth/discord"
          className="w-full flex items-center justify-center py-2 px-4 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4]"
        >
          Continue with Discord
        </a>
      </div>
    </div>
  );
};
