import { Router, type IRouter, type RequestHandler } from "express";
import { db, customersTable, profilesTable, measurementsTable, shopsTable, invoicesTable } from "@workspace/db";
import { eq, and, ilike, desc, count } from "drizzle-orm";
import { CreateCustomerBody, UpdateCustomerBody, CreateProfileBody } from "@workspace/api-zod";
import { requireAuth, requireShopRole, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

const isShopUser: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    requireShopRole("shop_manager", "reception", "tailor")(req, res, next);
  });
};

const requireActiveShop: RequestHandler = async (req, res, next) => {
  const user = (req as any).user as AuthUser;
  if (!user?.shopId) { next(); return; }
  try {
    const [shop] = await db.select({ subscriptionStatus: shopsTable.subscriptionStatus })
      .from(shopsTable).where(eq(shopsTable.id, user.shopId));
    if (shop?.subscriptionStatus === 'expired' || shop?.subscriptionStatus === 'suspended') {
      const label = shop.subscriptionStatus === 'expired' ? 'منتهي' : 'موقوف';
      res.status(403).json({
        error: `المحل حالته ${label}، يمكنك فقط الاطلاع على البيانات السابقة وتصدير النسخة الاحتياطية.`,
        subscriptionStatus: shop.subscriptionStatus,
      });
      return;
    }
    next();
  } catch { next(); }
};

async function getProfilesWithMeasurements(shopId: number, customerId: number) {
  const profiles = await db.select().from(profilesTable)
    .where(and(eq(profilesTable.shopId, shopId), eq(profilesTable.customerId, customerId)))
    .orderBy(desc(profilesTable.isMain), profilesTable.createdAt);

  const result = [];
  for (const profile of profiles) {
    const [measurements] = await db.select().from(measurementsTable)
      .where(eq(measurementsTable.profileId, profile.id));
    
    const m = measurements ? {
      id: measurements.id,
      profileId: measurements.profileId,
      length: measurements.length ? parseFloat(measurements.length) : null,
      shoulder: measurements.shoulder ? parseFloat(measurements.shoulder) : null,
      chest: measurements.chest ? parseFloat(measurements.chest) : null,
      sleeve: measurements.sleeve ? parseFloat(measurements.sleeve) : null,
      neck: measurements.neck ? parseFloat(measurements.neck) : null,
      modelNotes: measurements.modelNotes,
      generalNotes: measurements.generalNotes,
      updatedAt: measurements.updatedAt,
    } : null;

    result.push({ ...profile, measurements: m });
  }
  return result;
}

router.get("/shop/customers", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { phone, name } = req.query as { phone?: string; name?: string };
  const cleanPhone = phone && phone !== "null" && phone !== "undefined" ? phone : undefined;
  const cleanName = name && name !== "null" && name !== "undefined" ? name : undefined;

  let customers;
  if (cleanPhone) {
    customers = await db.select().from(customersTable)
      .where(and(eq(customersTable.shopId, user.shopId!), ilike(customersTable.phone, `%${cleanPhone}%`)));
  } else if (cleanName) {
    customers = await db.select().from(customersTable)
      .where(and(eq(customersTable.shopId, user.shopId!), ilike(customersTable.name, `%${cleanName}%`)));
  } else {
    customers = await db.select().from(customersTable)
      .where(eq(customersTable.shopId, user.shopId!))
      .orderBy(customersTable.createdAt);
  }

  res.json({ customers });
});

router.post("/shop/customers", isShopUser, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.phone, parsed.data.phone)));
  
  if (existing.length > 0) {
    res.status(400).json({ error: "رقم الهاتف مسجل بالفعل" });
    return;
  }

  const [customer] = await db.insert(customersTable).values({
    shopId: user.shopId!,
    phone: parsed.data.phone,
    name: parsed.data.name,
    notes: parsed.data.notes,
  }).returning();

  await db.insert(profilesTable).values([
    {
      customerId: customer.id,
      shopId: user.shopId!,
      name: parsed.data.name,
      isMain: true,
      isProof: false,
    },
    {
      customerId: customer.id,
      shopId: user.shopId!,
      name: 'تجربه',
      isMain: false,
      isProof: true,
    },
  ]);

  res.status(201).json(customer);
});

router.get("/shop/customers/by-phone/:phone", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const phone = Array.isArray(req.params.phone) ? req.params.phone[0] : req.params.phone;

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.phone, phone)));

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const profiles = await getProfilesWithMeasurements(user.shopId!, customer.id);
  res.json({ ...customer, profiles });
});

router.get("/shop/customers/:customerId", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, id)));

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const profiles = await getProfilesWithMeasurements(user.shopId!, customer.id);
  res.json({ ...customer, profiles });
});

router.get("/shop/customers/:customerId/activity", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const customerId = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);

  // Verify customer belongs to this shop
  const [customer] = await db.select({ id: customersTable.id })
    .from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, customerId)));
  if (!customer) { res.status(404).json({ error: "العميل غير موجود" }); return; }

  // Measurement updates: profiles + measurements sorted by updatedAt desc
  const profiles = await db.select({
    profileId: profilesTable.id,
    profileName: profilesTable.name,
    isMain: profilesTable.isMain,
    updatedAt: measurementsTable.updatedAt,
    length: measurementsTable.length,
    shoulder: measurementsTable.shoulder,
    chest: measurementsTable.chest,
    sleeve: measurementsTable.sleeve,
    neck: measurementsTable.neck,
    modelNotes: measurementsTable.modelNotes,
    generalNotes: measurementsTable.generalNotes,
  })
    .from(profilesTable)
    .innerJoin(measurementsTable, eq(measurementsTable.profileId, profilesTable.id))
    .where(and(eq(profilesTable.shopId, user.shopId!), eq(profilesTable.customerId, customerId)))
    .orderBy(desc(measurementsTable.updatedAt));

  const measurementTotal = profiles.length;
  const measurementUpdates = profiles.map(p => ({
    ...p,
    length: p.length ? parseFloat(p.length) : null,
    shoulder: p.shoulder ? parseFloat(p.shoulder) : null,
    chest: p.chest ? parseFloat(p.chest) : null,
    sleeve: p.sleeve ? parseFloat(p.sleeve) : null,
    neck: p.neck ? parseFloat(p.neck) : null,
  }));

  // Invoices: for this customer sorted by createdAt desc
  const allInvoices = await db.select({
    id: invoicesTable.id,
    invoiceNumber: invoicesTable.invoiceNumber,
    status: invoicesTable.status,
    createdAt: invoicesTable.createdAt,
    deliveredAt: invoicesTable.deliveredAt,
    allSubOrdersReady: invoicesTable.allSubOrdersReady,
  })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.customerId, customerId)))
    .orderBy(desc(invoicesTable.createdAt));

  const invoiceTotal = allInvoices.length;
  const invoices = allInvoices.slice(0, 5);

  res.json({ measurementUpdates, measurementTotal, invoices, invoiceTotal });
});

router.patch("/shop/customers/:customerId", isShopUser, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check duplicate phone — reject if another customer in this shop has the same number
  if (parsed.data.phone) {
    const [existing] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.shopId, user.shopId!),
          eq(customersTable.phone, parsed.data.phone),
        )
      )
      .limit(1);
    if (existing && existing.id !== id) {
      res.status(409).json({ error: "هذا الرقم مسجل مسبقاً لعميل آخر" });
      return;
    }
  }

  const [customer] = await db.update(customersTable)
    .set({
      name: parsed.data.name ?? undefined,
      notes: parsed.data.notes,
      phone: parsed.data.phone ?? undefined,
    })
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, id)))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  // Sync name to the main profile so both stay in step
  if (parsed.data.name) {
    await db.update(profilesTable)
      .set({ name: parsed.data.name })
      .where(and(
        eq(profilesTable.shopId, user.shopId!),
        eq(profilesTable.customerId, id),
        eq(profilesTable.isMain, true),
      ));
  }

  res.json(customer);
});

router.post("/shop/profiles", isShopUser, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, parsed.data.customerId)));

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const [profile] = await db.insert(profilesTable).values({
    customerId: parsed.data.customerId,
    shopId: user.shopId!,
    name: parsed.data.name,
    isMain: parsed.data.isMain,
    notes: parsed.data.notes,
  }).returning();

  res.status(201).json(profile);
});

router.get("/shop/profiles/:profileId", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId, 10);

  const [profile] = await db.select().from(profilesTable)
    .where(and(eq(profilesTable.shopId, user.shopId!), eq(profilesTable.id, id)));

  if (!profile) {
    res.status(404).json({ error: "الملف غير موجود" });
    return;
  }

  const [measurements] = await db.select().from(measurementsTable)
    .where(eq(measurementsTable.profileId, id));

  const m = measurements ? {
    id: measurements.id,
    profileId: measurements.profileId,
    length: measurements.length ? parseFloat(measurements.length) : null,
    shoulder: measurements.shoulder ? parseFloat(measurements.shoulder) : null,
    chest: measurements.chest ? parseFloat(measurements.chest) : null,
    sleeve: measurements.sleeve ? parseFloat(measurements.sleeve) : null,
    neck: measurements.neck ? parseFloat(measurements.neck) : null,
    modelNotes: measurements.modelNotes,
    generalNotes: measurements.generalNotes,
    updatedAt: measurements.updatedAt,
  } : null;

  res.json({ ...profile, measurements: m });
});

router.patch("/shop/profiles/:profileId", isShopUser, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId, 10);

  const [profile] = await db.update(profilesTable)
    .set({ name: req.body.name ?? undefined, notes: req.body.notes })
    .where(and(eq(profilesTable.shopId, user.shopId!), eq(profilesTable.id, id)))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "الملف غير موجود" });
    return;
  }

  // If this is the main profile, sync the name back to the customer record too
  if (profile.isMain && req.body.name) {
    await db.update(customersTable)
      .set({ name: req.body.name })
      .where(and(
        eq(customersTable.shopId, user.shopId!),
        eq(customersTable.id, profile.customerId),
      ));
  }

  res.json(profile);
});

router.put("/shop/measurements/:profileId", isShopUser, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const profileId = parseInt(Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId, 10);

  const [profile] = await db.select().from(profilesTable)
    .where(and(eq(profilesTable.shopId, user.shopId!), eq(profilesTable.id, profileId)));

  if (!profile) {
    res.status(404).json({ error: "الملف غير موجود" });
    return;
  }

  const { length, shoulder, chest, sleeve, neck, modelNotes, generalNotes } = req.body;

  const existing = await db.select().from(measurementsTable)
    .where(eq(measurementsTable.profileId, profileId));

  let m;
  if (existing.length > 0) {
    const [updated] = await db.update(measurementsTable).set({
      length: length?.toString(),
      shoulder: shoulder?.toString(),
      chest: chest?.toString(),
      sleeve: sleeve?.toString(),
      neck: neck?.toString(),
      modelNotes,
      generalNotes,
    }).where(eq(measurementsTable.profileId, profileId)).returning();
    m = updated;
  } else {
    const [created] = await db.insert(measurementsTable).values({
      profileId,
      length: length?.toString(),
      shoulder: shoulder?.toString(),
      chest: chest?.toString(),
      sleeve: sleeve?.toString(),
      neck: neck?.toString(),
      modelNotes,
      generalNotes,
    }).returning();
    m = created;
  }

  res.json({
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
  });
});

export default router;
