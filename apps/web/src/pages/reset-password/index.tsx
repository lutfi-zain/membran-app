import type React from "react";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = "/login";
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Set new password</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && (
            <div className="text-red-500 text-sm text-center">{message}</div>
          )}
          <input
            type="password"
            placeholder="New password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
