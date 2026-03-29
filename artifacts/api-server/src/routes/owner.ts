import { Router, type IRouter } from "express";
import { db, shopsTable, usersTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { CreateShopBody, UpdateShopBody } from "@workspace/api-zod";
import { requireAuth, requireOwner, hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/owner/shops", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const { status, area } = req.query as { status?: string; area?: string };

  const conditions = [];
  if (status && status !== "null") {
    conditions.push(eq(shopsTable.subscriptionStatus, status));
  }
  if (area && area !== "null") {
    conditions.push(eq(shopsTable.area, area));
  }

  const shops = conditions.length > 0
    ? await db.select().from(shopsTable).where(and(...conditions)).orderBy(shopsTable.createdAt)
    : await db.select().from(shopsTable).orderBy(shopsTable.createdAt);

  res.json({ shops });
});

// Check uniqueness of shop name, phone, or manager username before creating
router.get("/owner/check-unique", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const { field, value } = req.query as { field?: string; value?: string };
  if (!field || !value) { res.json({ taken: false }); return; }

  let taken = false;
  if (field === 'name') {
    const [row] = await db.select({ id: shopsTable.id }).from(shopsTable)
      .where(ilike(shopsTable.name, value.trim()));
    taken = !!row;
  } else if (field === 'phone') {
    const [row] = await db.select({ id: shopsTable.id }).from(shopsTable)
      .where(eq(shopsTable.phone, value.trim()));
    taken = !!row;
  } else if (field === 'username') {
    const [row] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.username, value.trim()));
    taken = !!row;
  }
  res.json({ taken });
});

router.post("/owner/shops", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const body = { ...req.body };
  if (body.subscriptionStart && typeof body.subscriptionStart === 'string') body.subscriptionStart = new Date(body.subscriptionStart);
  if (body.subscriptionEnd && typeof body.subscriptionEnd === 'string') body.subscriptionEnd = new Date(body.subscriptionEnd);
  const parsed = CreateShopBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { managerUsername, managerPassword, ...shopData } = parsed.data;

  if (managerPassword.length < 6) {
    res.status(400).json({ error: "كلمة مرور المدير يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const plan = (req.body.plan === 'light' || req.body.plan === 'premium') ? req.body.plan : 'premium';

  const [shop] = await db.insert(shopsTable).values({
    name: shopData.name,
    managerName: shopData.managerName,
    phone: shopData.phone,
    area: shopData.area,
    subscriptionStart: shopData.subscriptionStart,
    subscriptionEnd: shopData.subscriptionEnd,
    subscriptionStatus: shopData.subscriptionStatus,
    plan,
    notes: shopData.notes,
  }).returning();

  await db.insert(usersTable).values({
    shopId: shop.id,
    username: managerUsername,
    passwordHash: hashPassword(managerPassword),
    name: shopData.managerName,
    role: "shop_manager",
  });

  res.status(201).json(shop);
});

router.get("/owner/shops/:shopId", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.shopId) ? req.params.shopId[0] : req.params.shopId, 10);
  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, id));
  if (!shop) {
    res.status(404).json({ error: "المحل غير موجود" });
    return;
  }
  res.json(shop);
});

router.patch("/owner/shops/:shopId", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.shopId) ? req.params.shopId[0] : req.params.shopId, 10);
  // Coerce date strings to Date objects before Zod validation
  const body = { ...req.body };
  if (body.subscriptionStart && typeof body.subscriptionStart === 'string') body.subscriptionStart = new Date(body.subscriptionStart);
  if (body.subscriptionEnd && typeof body.subscriptionEnd === 'string') body.subscriptionEnd = new Date(body.subscriptionEnd);
  const parsed = UpdateShopBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  const d = parsed.data;
  if (d.name != null) updateData.name = d.name;
  if (d.managerName != null) updateData.managerName = d.managerName;
  if (d.phone != null) updateData.phone = d.phone;
  if (d.area != null) updateData.area = d.area;
  if (d.subscriptionStart != null) updateData.subscriptionStart = d.subscriptionStart;
  if (d.subscriptionEnd != null) updateData.subscriptionEnd = d.subscriptionEnd;
  if (d.subscriptionStatus != null) updateData.subscriptionStatus = d.subscriptionStatus;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (req.body.plan === 'light' || req.body.plan === 'premium') updateData.plan = req.body.plan;

  const [shop] = await db.update(shopsTable).set(updateData).where(eq(shopsTable.id, id)).returning();
  if (!shop) {
    res.status(404).json({ error: "المحل غير موجود" });
    return;
  }
  res.json(shop);
});

router.get("/owner/shops/:shopId/users", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.shopId) ? req.params.shopId[0] : req.params.shopId, 10);
  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    name: usersTable.name,
    role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.shopId, id));
  res.json({ users });
});

router.patch("/owner/shops/:shopId/users/:userId", requireAuth, requireOwner, async (req, res): Promise<void> => {
  const shopId = parseInt(Array.isArray(req.params.shopId) ? req.params.shopId[0] : req.params.shopId, 10);
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  const { username, password, name } = req.body;

  if (password && password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const updateData: Record<string, any> = {};
  if (username) updateData.username = username;
  if (name) updateData.name = name;
  if (password) updateData.passwordHash = hashPassword(password);

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "لا يوجد بيانات للتحديث" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set(updateData)
    .where(and(eq(usersTable.id, userId), eq(usersTable.shopId, shopId)))
    .returning({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role });

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json(user);
});

router.get("/owner/stats", requireAuth, requireOwner, async (_req, res): Promise<void> => {
  const allShops = await db.select().from(shopsTable);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalShops = allShops.length;
  const activeShops = allShops.filter(s => s.subscriptionStatus === "active").length;
  const expiredShops = allShops.filter(s => s.subscriptionStatus === "expired").length;
  const suspendedShops = allShops.filter(s => s.subscriptionStatus === "suspended").length;
  const newThisMonth = allShops.filter(s => new Date(s.createdAt) >= startOfMonth).length;

  const areaMap = new Map<string, number>();
  for (const shop of allShops) {
    areaMap.set(shop.area, (areaMap.get(shop.area) || 0) + 1);
  }
  const shopsByArea = Array.from(areaMap.entries()).map(([area, count]) => ({ area, count }));

  res.json({ totalShops, activeShops, expiredShops, suspendedShops, newThisMonth, shopsByArea });
});

export default router;
