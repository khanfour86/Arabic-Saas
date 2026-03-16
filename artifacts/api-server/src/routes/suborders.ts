import { Router, type IRouter } from "express";
import { db, subOrdersTable, invoicesTable, profilesTable, measurementsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { type AuthUser } from "../lib/auth";
import { isShopUser, isTailor, isManagerOrReception } from "../lib/shopMiddleware";

const router: IRouter = Router();

async function checkAndUpdateInvoiceReadiness(shopId: number, invoiceId: number) {
  const subOrders = await db.select().from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, shopId), eq(subOrdersTable.invoiceId, invoiceId)));

  const allReady = subOrders.length > 0 && subOrders.every(so => so.status === "ready");

  await db.update(invoicesTable)
    .set({
      allSubOrdersReady: allReady,
      status: allReady ? "ready" : "under_tailoring",
    })
    .where(eq(invoicesTable.id, invoiceId));
}

async function buildSubOrderResponse(so: any) {
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

  return {
    id: so.id,
    invoiceId: so.invoiceId,
    shopId: so.shopId,
    profileId: so.profileId,
    profileName: profile?.name ?? "غير معروف",
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
  };
}

router.post("/shop/suborders", isManagerOrReception, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { invoiceId, profileId, quantity, fabricSource, fabricDescription, price, paidAmount, notes } = req.body;

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, invoiceId)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  const existingSubOrders = await db.select().from(subOrdersTable)
    .where(eq(subOrdersTable.invoiceId, invoiceId));
  const subOrderNumber = `${invoice.invoiceNumber}-${existingSubOrders.length + 1}`;

  const [so] = await db.insert(subOrdersTable).values({
    invoiceId,
    shopId: user.shopId!,
    profileId,
    subOrderNumber,
    quantity,
    fabricSource,
    fabricDescription: fabricDescription ?? null,
    price: price.toString(),
    paidAmount: paidAmount.toString(),
    notes: notes ?? null,
    status: "under_tailoring",
  }).returning();

  await checkAndUpdateInvoiceReadiness(user.shopId!, invoiceId);
  const result = await buildSubOrderResponse(so);
  res.status(201).json(result);
});

router.patch("/shop/suborders/:subOrderId", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.subOrderId) ? req.params.subOrderId[0] : req.params.subOrderId, 10);

  const [existing] = await db.select().from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.id, id)));

  if (!existing) {
    res.status(404).json({ error: "الطلب الفرعي غير موجود" });
    return;
  }

  const updateData: Record<string, any> = {};
  if (req.body.quantity != null) updateData.quantity = req.body.quantity;
  if (req.body.fabricSource) updateData.fabricSource = req.body.fabricSource;
  if (req.body.fabricDescription !== undefined) updateData.fabricDescription = req.body.fabricDescription;
  if (req.body.price != null) updateData.price = req.body.price.toString();
  if (req.body.paidAmount != null) updateData.paidAmount = req.body.paidAmount.toString();
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;

  const [so] = await db.update(subOrdersTable).set(updateData).where(eq(subOrdersTable.id, id)).returning();
  const result = await buildSubOrderResponse(so);
  res.json(result);
});

router.post("/shop/suborders/:subOrderId/ready", isTailor, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.subOrderId) ? req.params.subOrderId[0] : req.params.subOrderId, 10);

  const [existing] = await db.select().from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.id, id)));

  if (!existing) {
    res.status(404).json({ error: "الطلب الفرعي غير موجود" });
    return;
  }

  const [so] = await db.update(subOrdersTable)
    .set({ status: "ready" })
    .where(eq(subOrdersTable.id, id))
    .returning();

  await checkAndUpdateInvoiceReadiness(user.shopId!, so.invoiceId);
  const result = await buildSubOrderResponse(so);
  res.json(result);
});

export default router;
