import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "tailoring_salt_2024").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
  shopId: number | null;
}

const SESSION_TTL_DAYS = 30;

export async function createSession(user: AuthUser): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  await db.insert(sessionsTable).values({
    token,
    userId: String(user.id),
    userData: JSON.stringify(user),
    expiresAt,
  });
  return token;
}

export async function getSession(token: string): Promise<AuthUser | undefined> {
  const [row] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!row) return undefined;
  if (new Date() > row.expiresAt) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return undefined;
  }
  return JSON.parse(row.userData) as AuthUser;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const user = await getSession(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).user = user;
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthUser;
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireShopRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
