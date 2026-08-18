export const SAMPLE_REPO = `### src/auth/login.ts
import { checkRateLimit } from "./rateLimiter";
import { verifyPassword } from "./hash";
import { db } from "../db/client";

export async function login(email: string, password: string) {
  const allowed = await checkRateLimit(email);
  if (!allowed) {
    throw new Error("Too many login attempts. Try again later.");
  }

  const user = await db.users.findByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  return issueSession(user.id);
}

function issueSession(userId: string) {
  return { userId, token: cryptoRandomToken() };
}

function cryptoRandomToken() {
  return Math.random().toString(36).slice(2);
}

### src/auth/rateLimiter.ts
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function checkRateLimit(key: string): Promise<boolean> {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

### src/auth/hash.ts
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

### src/db/client.ts
// Minimal fake DB client for demo purposes.
export const db = {
  users: {
    async findByEmail(email: string) {
      return { id: "u_123", email, passwordHash: "\$2a\$10\$examplehash" };
    },
  },
};

### src/payments/checkout.ts
import { db } from "../db/client";

export async function checkout(userId: string, cartId: string) {
  const total = await calculateTotal(cartId);
  return { userId, cartId, total, status: "confirmed" };
}

async function calculateTotal(cartId: string) {
  return 42.0;
}
`;