import { Router, type IRouter } from "express";
import { db, usersTable, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, createSession, deleteSession, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }

  let shopName: string | null = null;
  if (user.shopId) {
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, user.shopId));
    shopName = shop?.name ?? null;
  }

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    shopId: user.shopId,
  };

  const token = createSession(authUser);

  res.json({
    user: { ...authUser, shopName },
    token,
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const auth = req.headers.authorization!;
  const token = auth.slice(7);
  deleteSession(token);
  res.json({ message: "تم تسجيل الخروج" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  let shopName: string | null = null;
  if (user.shopId) {
    const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, user.shopId));
    shopName = shop?.name ?? null;
  }
  res.json({ ...user, shopName });
});

export default router;
