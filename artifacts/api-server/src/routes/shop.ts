import { Router, type IRouter } from "express";
import { db, invoicesTable, subOrdersTable, customersTable, profilesTable, measurementsTable, usersTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth, requireShopRole, type AuthUser } from "../lib/auth";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/shop/dashboard", requireAuth, requireShopRole("shop_manager", "reception"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.shopId, user.shopId!));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const underTailoring = allInvoices.filter(i => i.status === "under_tailoring").length;
  const readyForDelivery = allInvoices.filter(i => i.allSubOrdersReady && i.status === "ready").length;
  const deliveredToday = allInvoices.filter(i => i.status === "delivered" && i.deliveredAt && new Date(i.deliveredAt) >= today).length;
  const totalDelivered = allInvoices.filter(i => i.status === "delivered").length;

  res.json({ underTailoring, readyForDelivery, deliveredToday, totalDelivered });
});

router.get("/shop/tailor-queue", requireAuth, requireShopRole("shop_manager", "tailor"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const invoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.status, "under_tailoring")))
    .orderBy(desc(invoicesTable.createdAt));

  const items = [];
  for (const invoice of invoices) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, invoice.customerId));
    const subOrders = await db.select().from(subOrdersTable)
      .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, invoice.id)))
      .orderBy(subOrdersTable.subOrderNumber);

    const soWithDetails = [];
    for (const so of subOrders) {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, so.profileId));
      const [m] = await db.select().from(measurementsTable).where(eq(measurementsTable.profileId, so.profileId));

      const measurements = m ? {
        id: m.id,
        profileId: m.profileId,
        length: m.length ? parseFloat(m.length) : null,
        shoulder: m.shoulder ? parseFloat(m.shoulder) : null,
        chest: m.chest ? parseFloat(m.chest) : null,
        sleeve: m.sleeve ? parseFloat(m.sleeve) : null,
        neck: m.neck ? parseFloat(m.neck) : null,
        modelNotes: m.modelNotes,
        generalNotes: m.generalNotes,
        updatedAt: m.updatedAt,
      } : null;

      soWithDetails.push({
        id: so.id,
        invoiceId: so.invoiceId,
        shopId: so.shopId,
        profileId: so.profileId,
        profileName: profile?.name ?? "غير معروف",
        isProof: profile?.isProof ?? false,
        isMain: profile?.isMain ?? false,
        subOrderNumber: so.subOrderNumber,
        quantity: so.quantity,
        fabricSource: so.fabricSource,
        fabricDescription: so.fabricDescription,
        price: parseFloat(so.price),
        paidAmount: parseFloat(so.paidAmount),
        remainingAmount: parseFloat(so.price) - parseFloat(so.paidAmount),
        notes: so.notes,
        status: so.status,
        createdAt: so.createdAt,
        measurements,
      });
    }

    items.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: customer?.name ?? "غير معروف",
      customerPhone: customer?.phone ?? "",
      subOrders: soWithDetails,
    });
  }

  res.json({ items });
});

router.get("/shop/users", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const users = await db.select().from(usersTable).where(eq(usersTable.shopId, user.shopId!));
  const safeUsers = users.map(u => ({
    id: u.id,
    shopId: u.shopId,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json({ users: safeUsers });
});

const ALLOWED_SHOP_ROLES = ['reception', 'tailor'] as const;

router.post("/shop/users", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { username, name, password, role } = req.body;

  if (!username || !name || !password || !role) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  if (!ALLOWED_SHOP_ROLES.includes(role)) {
    res.status(403).json({ error: `الدور '${role}' غير مسموح به. الأدوار المسموحة: ${ALLOWED_SHOP_ROLES.join(', ')}` });
    return;
  }

  const [newUser] = await db.insert(usersTable).values({
    shopId: user.shopId!,
    username,
    passwordHash: hashPassword(password),
    name,
    role,
  }).returning();

  res.status(201).json({
    id: newUser.id,
    shopId: newUser.shopId,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    createdAt: newUser.createdAt,
  });
});

router.patch("/shop/users/:userId", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  if (req.body.role && !ALLOWED_SHOP_ROLES.includes(req.body.role)) {
    res.status(403).json({ error: `الدور '${req.body.role}' غير مسموح به. الأدوار المسموحة: ${ALLOWED_SHOP_ROLES.join(', ')}` });
    return;
  }

  if (req.body.password && req.body.password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const updateData: Record<string, any> = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.role) updateData.role = req.body.role;
  if (req.body.password) updateData.passwordHash = hashPassword(req.body.password);

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(and(eq(usersTable.shopId, user.shopId!), eq(usersTable.id, id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json({
    id: updated.id,
    shopId: updated.shopId,
    username: updated.username,
    name: updated.name,
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

router.delete("/shop/users/:userId", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  await db.delete(usersTable).where(and(eq(usersTable.shopId, user.shopId!), eq(usersTable.id, id)));
  res.sendStatus(204);
});

router.get("/shop/export/customers", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const customers = await db.select().from(customersTable).where(eq(customersTable.shopId, user.shopId!));
  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.shopId, user.shopId!));
  const measurements = await db.select().from(measurementsTable);

  const data = customers.map(c => ({
    ...c,
    profiles: profiles.filter(p => p.customerId === c.id).map(p => ({
      ...p,
      measurements: measurements.find(m => m.profileId === p.id) || null,
    })),
  }));

  res.json({ data, exportedAt: new Date(), count: data.length });
});

router.get("/shop/export/invoices", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.shopId, user.shopId!));
  const subOrders = await db.select().from(subOrdersTable).where(eq(subOrdersTable.shopId, user.shopId!));

  const data = invoices.map(inv => ({
    ...inv,
    subOrders: subOrders.filter(so => so.invoiceId === inv.id),
  }));

  res.json({ data, exportedAt: new Date(), count: data.length });
});

export default router;
