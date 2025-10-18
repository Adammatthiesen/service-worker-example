import { db, User, Session, eq } from 'astro:db';
import bcrypt from 'bcryptjs';
import type { AstroCookies } from 'astro';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  displayName: string | null;
}

// Generate a random session token
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify a password against a hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create a new session for a user
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await db.insert(Session).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt,
  });

  return token;
}

// Get user from session token
export async function getUserFromSession(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  const session = await db
    .select()
    .from(Session)
    .where(eq(Session.token, token))
    .get();

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(User)
    .where(eq(User.id, session.userId))
    .get();

  if (!user || !user.active) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
}

// Get user from cookies
export async function getUserFromCookies(cookies: AstroCookies): Promise<AuthUser | null> {
  const token = cookies.get('session_token')?.value;
  if (!token) return null;
  return getUserFromSession(token);
}

// Delete a session
export async function deleteSession(token: string): Promise<void> {
  await db.delete(Session).where(eq(Session.token, token));
}

// Check if user has required role
export function hasRole(user: AuthUser | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Role hierarchy for permission checks
const roleHierarchy: Record<string, number> = {
  admin: 100,
  moderator: 50,
  user: 10,
  subscriber: 5,
};

// Check if user has at least the required role level
export function hasMinimumRole(user: AuthUser | null, minimumRole: string): boolean {
  if (!user) return false;
  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;
  return userLevel >= requiredLevel;
}
