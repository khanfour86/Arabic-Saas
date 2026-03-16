import { Router, type IRouter } from "express";
import { db, invoicesTable, subOrdersTable, customersTable, profilesTable, measurementsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { type AuthUser } from "../lib/auth";
import { isShopUser, isManagerOrReception } from "../lib/shopMiddleware";

const router: IRouter = Router();

async function getSubOrdersForInvoice(shopId: number, invoiceId: number) {
  const subOrders = await db.select().from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, shopId), eq(subOrdersTable.invoiceId, invoiceId)))
    .orderBy(subOrdersTable.subOrderNumber);

  const result = [];
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

    result.push({
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
    });
  }
  return result;
}

async function buildInvoiceResponse(shopId: number, invoice: any) {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, invoice.customerId));
  const subOrders = await getSubOrdersForInvoice(shopId, invoice.id);
  const totalAmount = subOrders.reduce((s, so) => s + so.price, 0);
  const paidAmount = subOrders.reduce((s, so) => s + so.paidAmount, 0);

  return {
    id: invoice.id,
    shopId: invoice.shopId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    customerName: customer?.name ?? "غير معروف",
    customerPhone: customer?.phone ?? "",
    status: invoice.status,
    totalAmount,
    paidAmount,
    remainingAmount: totalAmount - paidAmount,
    notes: invoice.notes,
    allSubOrdersReady: invoice.allSubOrdersReady,
    createdAt: invoice.createdAt,
    deliveredAt: invoice.deliveredAt,
    subOrders,
  };
}

async function generateInvoiceNumber(shopId: number): Promise<string> {
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.shopId, shopId));
  const nextNum = invoices.length + 1000 + 1;
  return nextNum.toString();
}

router.get("/shop/invoices", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { status, phone, invoiceNumber, readyForDelivery } = req.query as any;
  const cleanStatus = status && status !== "null" && status !== "undefined" ? status : undefined;
  const cleanPhone = phone && phone !== "null" && phone !== "undefined" ? phone : undefined;
  const cleanInvoiceNumber = invoiceNumber && invoiceNumber !== "null" && invoiceNumber !== "undefined" ? invoiceNumber : undefined;

  let allInvoices = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.shopId, user.shopId!))
    .orderBy(invoicesTable.createdAt);

  if (cleanStatus) {
    allInvoices = allInvoices.filter(i => i.status === cleanStatus);
  }
  if (readyForDelivery === "true") {
    allInvoices = allInvoices.filter(i => i.allSubOrdersReady && i.status !== "delivered");
  }

  const invoices = [];
  for (const inv of allInvoices) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, inv.customerId));
    // When both phone and invoiceNumber arrive together (OR search from the UI)
    // show the invoice if it matches either; otherwise apply each filter independently
    if (cleanPhone && cleanInvoiceNumber) {
      const phoneMatch = customer?.phone.includes(cleanPhone) ?? false;
      const invoiceMatch = inv.invoiceNumber.includes(cleanInvoiceNumber);
      if (!phoneMatch && !invoiceMatch) continue;
    } else {
      if (cleanPhone && !(customer?.phone.includes(cleanPhone) ?? false)) continue;
      if (cleanInvoiceNumber && !inv.invoiceNumber.includes(cleanInvoiceNumber)) continue;
    }

    const subOrders = await getSubOrdersForInvoice(user.shopId!, inv.id);
    const totalAmount = subOrders.reduce((s, so) => s + so.price, 0);
    const paidAmount = subOrders.reduce((s, so) => s + so.paidAmount, 0);

    invoices.push({
      id: inv.id,
      shopId: inv.shopId,
      customerId: inv.customerId,
      invoiceNumber: inv.invoiceNumber,
      customerName: customer?.name ?? "غير معروف",
      customerPhone: customer?.phone ?? "",
      status: inv.status,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      notes: inv.notes,
      allSubOrdersReady: inv.allSubOrdersReady,
      createdAt: inv.createdAt,
      deliveredAt: inv.deliveredAt,
    });
  }

  res.json({ invoices });
});

router.post("/shop/invoices", isManagerOrReception, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { customerId, notes, subOrders } = req.body;

  if (!customerId || !subOrders || subOrders.length === 0) {
    res.status(400).json({ error: "بيانات الفاتورة غير مكتملة" });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, customerId)));

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const invoiceNumber = await generateInvoiceNumber(user.shopId!);

  const [invoice] = await db.insert(invoicesTable).values({
    shopId: user.shopId!,
    customerId,
    invoiceNumber,
    status: "under_tailoring",
    notes: notes ?? null,
    allSubOrdersReady: false,
  }).returning();

  for (let i = 0; i < subOrders.length; i++) {
    const so = subOrders[i];
    const subOrderNumber = `${invoiceNumber}-${i + 1}`;
    await db.insert(subOrdersTable).values({
      invoiceId: invoice.id,
      shopId: user.shopId!,
      profileId: so.profileId,
      subOrderNumber,
      quantity: so.quantity,
      fabricSource: so.fabricSource,
      fabricDescription: so.fabricDescription ?? null,
      price: so.price.toString(),
      paidAmount: so.paidAmount.toString(),
      notes: so.notes ?? null,
      status: "under_tailoring",
    });
  }

  const result = await buildInvoiceResponse(user.shopId!, invoice);
  res.status(201).json(result);
});

router.get("/shop/invoices/:invoiceId", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  const result = await buildInvoiceResponse(user.shopId!, invoice);
  res.json(result);
});

router.patch("/shop/invoices/:invoiceId", isManagerOrReception, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.update(invoicesTable)
    .set({ notes: req.body.notes })
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  const result = await buildInvoiceResponse(user.shopId!, invoice);
  res.json(result);
});

router.post("/shop/invoices/:invoiceId/deliver", isManagerOrReception, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  if (!invoice.allSubOrdersReady) {
    res.status(400).json({ error: "لم تكتمل جميع الطلبات بعد" });
    return;
  }

  const [updated] = await db.update(invoicesTable)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(eq(invoicesTable.id, id))
    .returning();

  const result = await buildInvoiceResponse(user.shopId!, updated);
  res.json(result);
});

router.get("/shop/invoices/:invoiceId/whatsapp", isManagerOrReception, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  if (!invoice.allSubOrdersReady) {
    res.status(400).json({ error: "لم تكتمل جميع الطلبات بعد" });
    return;
  }

  const subOrders = await getSubOrdersForInvoice(user.shopId!, id);
  const totalAmount = subOrders.reduce((s, so) => s + so.price, 0);
  const paidAmount = subOrders.reduce((s, so) => s + so.paidAmount, 0);
  const remainingAmount = totalAmount - paidAmount;

  const message = remainingAmount > 0
    ? `عميلنا الكريم، تم الانتهاء من طلبكم رقم ${invoice.invoiceNumber}. يمكنكم التفضل بالاستلام من المحل. المبلغ المتبقي: ${remainingAmount.toFixed(3)} د.ك`
    : `عميلنا الكريم، تم الانتهاء من طلبكم رقم ${invoice.invoiceNumber}. يمكنكم التفضل بالاستلام من المحل. جزاكم الله خيراً`;

  res.json({ message, invoiceNumber: invoice.invoiceNumber, remainingAmount });
});

export default router;
