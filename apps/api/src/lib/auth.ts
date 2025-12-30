import { Discord } from "arctic";
import { generateRandomString, alphabet } from "oslo/crypto";

export const createDiscordAuth = (env: {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
}) => {
  return new Discord(
    env.DISCORD_CLIENT_ID,
    env.DISCORD_CLIENT_SECRET,
    env.DISCORD_REDIRECT_URI,
  );
};

export const generateVerificationToken = (): string => {
  return generateRandomString(32, alphabet("a-z", "0-9", "A-Z"));
};

export const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
};

// Web Crypto based PBKDF2 hashing for Cloudflare Workers compatibility
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashArray = new Uint8Array(key);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
};

export const verifyPassword = async (
  storedHash: string,
  password: string,
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const combined = new Uint8Array(
    atob(storedHash)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  const salt = combined.slice(0, 16);
  const hash = combined.slice(16);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const derivedHash = new Uint8Array(key);

  if (derivedHash.length !== hash.length) return false;

  let result = 0;
  for (let i = 0; i < derivedHash.length; i++) {
    result |= derivedHash[i] ^ hash[i];
  }
  return result === 0;
};
