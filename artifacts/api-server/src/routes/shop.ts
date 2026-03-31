import { Router, type IRouter } from "express";
import { db, invoicesTable, subOrdersTable, customersTable, profilesTable, measurementsTable, usersTable, shopsTable, stageHistoryTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireShopRole, type AuthUser } from "../lib/auth";
import { hashPassword } from "../lib/auth";
import { isShopUser, requireActiveShop } from "../lib/shopMiddleware";
import { getActiveStages, getNextStage } from "../lib/stageHelpers";

const router: IRouter = Router();

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get("/shop/dashboard", requireAuth, requireShopRole("shop_manager", "reception"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.shopId, user.shopId!));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const underTailoring = allInvoices.filter(i => i.status === "under_tailoring").length;
  const readyForDelivery = allInvoices.filter(i => i.allSubOrdersReady && i.status === "ready").length;
  const deliveredToday = allInvoices.filter(i => i.status === "delivered" && i.deliveredAt && new Date(i.deliveredAt) >= today).length;
  const totalDelivered = allInvoices.filter(i => i.status === "delivered").length;

  const [shop] = await db.select({ subscriptionStatus: shopsTable.subscriptionStatus, plan: shopsTable.plan }).from(shopsTable).where(eq(shopsTable.id, user.shopId!));
  res.json({ underTailoring, readyForDelivery, deliveredToday, totalDelivered, subscriptionStatus: shop?.subscriptionStatus ?? 'active', plan: shop?.plan ?? 'premium' });
});

router.get("/shop/status", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const [shop] = await db.select({ subscriptionStatus: shopsTable.subscriptionStatus, plan: shopsTable.plan }).from(shopsTable).where(eq(shopsTable.id, user.shopId!));
  res.json({ subscriptionStatus: shop?.subscriptionStatus ?? 'active', plan: shop?.plan ?? 'premium' });
});

// ─── Workflow Dashboard (Manager only) ───────────────────────────────────────

router.get("/shop/workflow", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { stage, invoiceNumber, customerName, phone } = req.query as Record<string, string>;

  const [shop] = await db.select({ plan: shopsTable.plan }).from(shopsTable).where(eq(shopsTable.id, user.shopId!));
  const plan = shop?.plan ?? 'premium';

  const activeStages = await getActiveStages(user.shopId!);

  // Count per stage
  const allActive = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.status, "under_tailoring")));

  const counts: Record<string, number> = {
    cutting: 0, assembly: 0, finishing: 0, ironing: 0, ready: 0
  };

  for (const inv of allActive) {
    if (inv.currentStage && counts[inv.currentStage] !== undefined) {
      counts[inv.currentStage]++;
    }
  }
  // Count ready
  const readyInvoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.status, "ready")));
  counts.ready = readyInvoices.length;

  // Build invoice list for the requested stage (or all stages)
  let invoicesToShow = [...allActive, ...readyInvoices];

  if (stage && stage !== 'all' && stage !== 'ready') {
    invoicesToShow = allActive.filter(i => i.currentStage === stage);
  } else if (stage === 'ready') {
    invoicesToShow = readyInvoices;
  }

  // Build result with customer info
  const result = [];
  for (const inv of invoicesToShow) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, inv.customerId));

    // Apply search filters
    if (invoiceNumber && !inv.invoiceNumber.includes(invoiceNumber)) continue;
    if (customerName && !(customer?.name ?? '').includes(customerName)) continue;
    if (phone && !(customer?.phone ?? '').includes(phone)) continue;

    // Get current tailor responsible for this stage
    let currentTailor: string | null = null;
    if (inv.currentStage) {
      const tailorsAtStage = await db.select({ name: usersTable.name, tailorRoles: usersTable.tailorRoles })
        .from(usersTable)
        .where(and(eq(usersTable.shopId, user.shopId!), eq(usersTable.role, 'tailor')));
      const match = tailorsAtStage.find(t => t.tailorRoles?.includes(inv.currentStage!));
      currentTailor = match?.name ?? null;
    }

    result.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      bookNumber: inv.bookNumber ?? null,
      pageNumber: inv.pageNumber ?? null,
      customerName: customer?.name ?? 'غير معروف',
      customerPhone: customer?.phone ?? '',
      customerIsVip: customer?.isVip ?? false,
      status: inv.status,
      currentStage: inv.currentStage ?? null,
      currentTailor,
      createdAt: inv.createdAt,
      plan,
    });
  }

  // Sort by newest first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ counts, activeStages, invoices: result, plan });
});

// ─── Tailor Queue ─────────────────────────────────────────────────────────────

router.get("/shop/tailor-queue", requireAuth, requireShopRole("shop_manager", "tailor"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const [shop] = await db.select({ plan: shopsTable.plan }).from(shopsTable).where(eq(shopsTable.id, user.shopId!));
  const plan = shop?.plan ?? 'premium';

  // Get tailor's roles
  const [tailorUser] = await db.select({ tailorRoles: usersTable.tailorRoles, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, user.id));

  const myRoles: string[] = tailorUser?.tailorRoles ?? [];

  // Manager sees all active invoices; tailor sees only their stages
  let invoices;
  if (tailorUser?.role === 'shop_manager') {
    invoices = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.status, "under_tailoring")))
      .orderBy(desc(invoicesTable.createdAt));
  } else {
    if (myRoles.length === 0) {
      res.json({ items: [], myRoles: [], plan });
      return;
    }
    invoices = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.status, "under_tailoring")))
      .orderBy(desc(invoicesTable.createdAt));
    // Filter to only those in tailor's stages
    invoices = invoices.filter(i => i.currentStage && myRoles.includes(i.currentStage));
  }

  const items = [];
  for (const invoice of invoices) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, invoice.customerId));

    if (plan === 'light') {
      // Light plan: only basic info
      const subOrders = await db.select().from(subOrdersTable)
        .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, invoice.id)));

      const qty = subOrders.reduce((s, so) => s + so.quantity, 0);
      const price = subOrders.reduce((s, so) => s + parseFloat(so.price), 0);
      const paid = subOrders.reduce((s, so) => s + parseFloat(so.paidAmount), 0);

      items.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        bookNumber: invoice.bookNumber ?? null,
        pageNumber: invoice.pageNumber ?? null,
        customerName: customer?.name ?? 'غير معروف',
        customerPhone: customer?.phone ?? '',
        customerIsVip: customer?.isVip ?? false,
        currentStage: invoice.currentStage ?? null,
        status: invoice.status,
        plan: 'light',
        quantity: qty,
        price,
        paidAmount: paid,
        remainingAmount: price - paid,
        subOrders: [],
      });
    } else {
      // Premium plan: full details with sub orders + measurements
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
          profileName: profile?.name ?? 'غير معروف',
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
        bookNumber: invoice.bookNumber ?? null,
        pageNumber: invoice.pageNumber ?? null,
        customerName: customer?.name ?? 'غير معروف',
        customerPhone: customer?.phone ?? '',
        customerIsVip: customer?.isVip ?? false,
        currentStage: invoice.currentStage ?? null,
        status: invoice.status,
        plan: 'premium',
        subOrders: soWithDetails,
      });
    }
  }

  res.json({ items, myRoles, plan });
});

// ─── Tailor Completed Orders ──────────────────────────────────────────────────

router.get("/shop/tailor-completed", requireAuth, requireShopRole("shop_manager", "tailor"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;

  const [shop] = await db.select({ plan: shopsTable.plan }).from(shopsTable).where(eq(shopsTable.id, user.shopId!));
  const plan = shop?.plan ?? 'premium';

  const history = await db.select().from(stageHistoryTable)
    .where(and(eq(stageHistoryTable.shopId, user.shopId!), eq(stageHistoryTable.completedBy, user.id)))
    .orderBy(desc(stageHistoryTable.completedAt));

  const items = [];
  for (const h of history) {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, h.invoiceId));
    if (!invoice) continue;
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, invoice.customerId));

    const subOrders = await db.select().from(subOrdersTable)
      .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, invoice.id)));
    const qty = subOrders.reduce((s, so) => s + so.quantity, 0);

    items.push({
      historyId: h.id,
      invoiceId: h.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      bookNumber: invoice.bookNumber ?? null,
      pageNumber: invoice.pageNumber ?? null,
      customerName: customer?.name ?? 'غير معروف',
      customerPhone: customer?.phone ?? '',
      customerIsVip: customer?.isVip ?? false,
      stage: h.stage,
      nextStage: h.nextStage ?? null,
      completedAt: h.completedAt,
      currentInvoiceStatus: invoice.status,
      currentStage: invoice.currentStage ?? null,
      quantity: qty,
      plan,
    });
  }

  res.json({ items, plan });
});

// ─── Users ────────────────────────────────────────────────────────────────────

router.get("/shop/users", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const users = await db.select().from(usersTable).where(eq(usersTable.shopId, user.shopId!));
  const safeUsers = users.map(u => ({
    id: u.id,
    shopId: u.shopId,
    username: u.username,
    name: u.name,
    role: u.role,
    tailorRoles: u.tailorRoles ?? [],
    createdAt: u.createdAt,
  }));
  res.json({ users: safeUsers });
});

const ALLOWED_SHOP_ROLES = ['reception', 'tailor'] as const;

router.post("/shop/users", requireAuth, requireShopRole("shop_manager"), requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { username, name, password, role, tailorRoles } = req.body;

  if (!username || !name || !password || !role) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  if (!ALLOWED_SHOP_ROLES.includes(role)) {
    res.status(403).json({ error: `الدور '${role}' غير مسموح به.` });
    return;
  }

  if (role === 'tailor' && (!tailorRoles || !Array.isArray(tailorRoles) || tailorRoles.length === 0)) {
    res.status(400).json({ error: "يجب اختيار دور واحد على الأقل للخياط" });
    return;
  }

  const validStages = ['cutting', 'assembly', 'finishing', 'ironing'];
  const cleanRoles = role === 'tailor' && Array.isArray(tailorRoles)
    ? tailorRoles.filter((r: string) => validStages.includes(r))
    : null;

  const [newUser] = await db.insert(usersTable).values({
    shopId: user.shopId!,
    username,
    passwordHash: hashPassword(password),
    name,
    role,
    tailorRoles: cleanRoles,
  }).returning();

  res.status(201).json({
    id: newUser.id,
    shopId: newUser.shopId,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    tailorRoles: newUser.tailorRoles ?? [],
    createdAt: newUser.createdAt,
  });
});

router.patch("/shop/users/:userId", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  if (req.body.role && !ALLOWED_SHOP_ROLES.includes(req.body.role)) {
    res.status(403).json({ error: `الدور '${req.body.role}' غير مسموح به.` });
    return;
  }

  if (req.body.password && req.body.password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const validStages = ['cutting', 'assembly', 'finishing', 'ironing'];
  const updateData: Record<string, any> = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.role) {
    updateData.role = req.body.role;
    // If changing to reception, clear tailor roles
    if (req.body.role === 'reception') {
      updateData.tailorRoles = null;
    }
  }
  if (req.body.password) updateData.passwordHash = hashPassword(req.body.password);
  if (req.body.tailorRoles !== undefined) {
    if (Array.isArray(req.body.tailorRoles) && req.body.tailorRoles.length > 0) {
      updateData.tailorRoles = req.body.tailorRoles.filter((r: string) => validStages.includes(r));
    } else {
      updateData.tailorRoles = null;
    }
  }

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
    tailorRoles: updated.tailorRoles ?? [],
    createdAt: updated.createdAt,
  });
});

router.delete("/shop/users/:userId", requireAuth, requireShopRole("shop_manager"), async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  await db.delete(usersTable).where(and(eq(usersTable.shopId, user.shopId!), eq(usersTable.id, id)));
  res.sendStatus(204);
});

// ─── Exports ──────────────────────────────────────────────────────────────────

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
