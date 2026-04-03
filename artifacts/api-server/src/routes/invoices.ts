import { Router, type IRouter } from "express";
import { db, invoicesTable, subOrdersTable, customersTable, profilesTable, measurementsTable, shopsTable, invoiceHistoryTable, stageHistoryTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { type AuthUser } from "../lib/auth";
import { isShopUser, isManagerOrReception, requireActiveShop } from "../lib/shopMiddleware";
import { requireAuth, requireShopRole } from "../lib/auth";
import { getActiveStages, getNextStage } from "../lib/stageHelpers";
import { validateProfileOwnership } from "../lib/profileValidation";

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
  const totalQty = subOrders.reduce((s, so) => s + so.quantity, 0);
  const readyQty: number = invoice.readyQty ?? 0;
  const deliveredQty: number = invoice.deliveredQty ?? 0;
  const inProgressQty = Math.max(0, totalQty - readyQty - deliveredQty);

  return {
    id: invoice.id,
    shopId: invoice.shopId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    customerName: customer?.name ?? "غير معروف",
    customerPhone: customer?.phone ?? "",
    customerIsVip: customer?.isVip ?? false,
    status: invoice.status,
    currentStage: invoice.currentStage ?? null,
    totalAmount,
    paidAmount,
    remainingAmount: totalAmount - paidAmount,
    notes: invoice.notes,
    bookNumber: invoice.bookNumber ?? null,
    pageNumber: invoice.pageNumber ?? null,
    allSubOrdersReady: invoice.allSubOrdersReady,
    totalQty,
    readyQty,
    deliveredQty,
    inProgressQty,
    qtyProcessed: invoice.qtyProcessed ?? 0,
    createdAt: invoice.createdAt,
    deliveredAt: invoice.deliveredAt,
    subOrders,
  };
}

async function generateInvoiceNumber(shopId: number, offset = 0): Promise<string> {
  const result = await db.execute(
    sql`SELECT COALESCE(MAX(CAST(invoice_number AS INTEGER)), 1000) + 1 + ${offset} AS next_num
        FROM invoices
        WHERE shop_id = ${shopId}
        AND invoice_number ~ '^[0-9]+$'`
  );
  return String((result.rows[0] as any).next_num);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (err as any)?.code === '23505';
}

router.get("/shop/invoices", isShopUser, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { status, phone, invoiceNumber, readyForDelivery, customerId } = req.query as any;
  const cleanStatus = status && status !== "null" && status !== "undefined" ? status : undefined;
  const cleanPhone = phone && phone !== "null" && phone !== "undefined" ? phone : undefined;
  const cleanInvoiceNumber = invoiceNumber && invoiceNumber !== "null" && invoiceNumber !== "undefined" ? invoiceNumber : undefined;
  const cleanCustomerId = customerId && customerId !== "null" && customerId !== "undefined" ? parseInt(customerId, 10) : undefined;

  let allInvoices = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.shopId, user.shopId!))
    .orderBy(desc(invoicesTable.createdAt));

  if (cleanCustomerId) {
    allInvoices = allInvoices.filter(i => i.customerId === cleanCustomerId);
  }
  if (cleanStatus) {
    allInvoices = allInvoices.filter(i => i.status === cleanStatus);
  }
  if (readyForDelivery === "true") {
    allInvoices = allInvoices.filter(i => i.readyQty > 0 && i.status !== "delivered");
  }

  const invoices = [];
  for (const inv of allInvoices) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, inv.customerId));
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
    const totalQty = subOrders.reduce((s, so) => s + so.quantity, 0);
    const readyQty = inv.readyQty ?? 0;
    const deliveredQty = inv.deliveredQty ?? 0;
    const inProgressQty = Math.max(0, totalQty - readyQty - deliveredQty);

    invoices.push({
      id: inv.id,
      shopId: inv.shopId,
      customerId: inv.customerId,
      invoiceNumber: inv.invoiceNumber,
      customerName: customer?.name ?? "غير معروف",
      customerPhone: customer?.phone ?? "",
      customerIsVip: customer?.isVip ?? false,
      status: inv.status,
      currentStage: inv.currentStage ?? null,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      notes: inv.notes,
      bookNumber: inv.bookNumber ?? null,
      pageNumber: inv.pageNumber ?? null,
      allSubOrdersReady: inv.allSubOrdersReady,
      totalQty,
      readyQty,
      deliveredQty,
      inProgressQty,
      createdAt: inv.createdAt,
      deliveredAt: inv.deliveredAt,
    });
  }

  res.json({ invoices });
});

router.post("/shop/invoices", isManagerOrReception, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const { customerId, notes, subOrders, bookNumber, pageNumber, quantity, price, paidAmount } = req.body;

  if (!customerId) {
    res.status(400).json({ error: "بيانات الفاتورة غير مكتملة" });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.shopId, user.shopId!), eq(customersTable.id, customerId)));

  if (!customer) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  // Determine starting stage based on shop's active tailors
  const activeStages = await getActiveStages(user.shopId!);
  const startingStage = activeStages.length > 0 ? activeStages[0] : null;

  const isLightPlan = !subOrders || subOrders.length === 0;

  if (isLightPlan) {
    const firstPrice = parseFloat(price) || 0;
    const firstPaid = parseFloat(paidAmount) || 0;
    if (firstPrice <= 0) {
      res.status(400).json({ error: "يجب إدخال السعر الإجمالي للفاتورة" });
      return;
    }
    if (firstPaid > firstPrice) {
      res.status(400).json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز السعر الإجمالي" });
      return;
    }
    if (!quantity || parseInt(quantity, 10) <= 0) {
      res.status(400).json({ error: "يجب إدخال الكمية" });
      return;
    }

    const [mainProfile] = await db.select().from(profilesTable)
      .where(and(eq(profilesTable.shopId, user.shopId!), eq(profilesTable.customerId, customerId), eq(profilesTable.isMain, true)));

    if (!mainProfile) {
      res.status(400).json({ error: "لم يتم العثور على ملف العميل الرئيسي" });
      return;
    }

    const invoiceNumber = await generateInvoiceNumber(user.shopId!);

    let invoice: any;
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const invNum = attempt === 0
        ? invoiceNumber
        : await generateInvoiceNumber(user.shopId!, attempt);
      try {
        invoice = await db.transaction(async (tx) => {
          const [inv] = await tx.insert(invoicesTable).values({
            shopId: user.shopId!,
            customerId,
            invoiceNumber: invNum,
            status: "under_tailoring",
            currentStage: startingStage,
            notes: notes ?? null,
            bookNumber: bookNumber ? bookNumber.toString() : null,
            pageNumber: pageNumber ? pageNumber.toString() : null,
            allSubOrdersReady: false,
            qtyProcessed: 0,
            readyQty: 0,
            deliveredQty: 0,
          }).returning();

          await tx.insert(subOrdersTable).values({
            invoiceId: inv.id,
            shopId: user.shopId!,
            profileId: mainProfile.id,
            subOrderNumber: `${invNum}-1`,
            quantity: parseInt(quantity, 10),
            fabricSource: "shop_fabric",
            fabricDescription: null,
            price: firstPrice.toString(),
            paidAmount: firstPaid.toString(),
            notes: null,
            status: "under_tailoring",
          });

          return inv;
        });
        break;
      } catch (err: any) {
        if (isUniqueConstraintError(err) && attempt < MAX_RETRIES - 1) continue;
        if (isUniqueConstraintError(err)) {
          res.status(409).json({ error: "تعذّر توليد رقم فاتورة فريد، يرجى المحاولة مرة أخرى" });
          return;
        }
        throw err;
      }
    }

    const result = await buildInvoiceResponse(user.shopId!, invoice);
    res.status(201).json(result);
    return;
  }

  // Premium plan
  const firstPrice = parseFloat(subOrders[0].price) || 0;
  const firstPaid = parseFloat(subOrders[0].paidAmount) || 0;
  if (firstPrice <= 0) {
    res.status(400).json({ error: "يجب إدخال السعر الإجمالي للفاتورة" });
    return;
  }
  if (firstPaid > firstPrice) {
    res.status(400).json({ error: "المبلغ المدفوع لا يمكن أن يتجاوز السعر الإجمالي" });
    return;
  }

  for (let i = 0; i < subOrders.length; i++) {
    const so = subOrders[i];
    try {
      await validateProfileOwnership(user.shopId!, customerId, so.profileId);
    } catch (err: any) {
      res.status(err.statusCode ?? 400).json({ error: `الطلب الفرعي ${i + 1}: ${err.message}` });
      return;
    }
  }

  const invoiceNumber = await generateInvoiceNumber(user.shopId!);

  let invoice: any;
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const invNum = attempt === 0
      ? invoiceNumber
      : await generateInvoiceNumber(user.shopId!, attempt);
    try {
      invoice = await db.transaction(async (tx) => {
        const [inv] = await tx.insert(invoicesTable).values({
          shopId: user.shopId!,
          customerId,
          invoiceNumber: invNum,
          status: "under_tailoring",
          currentStage: startingStage,
          notes: notes ?? null,
          allSubOrdersReady: false,
          qtyProcessed: 0,
          readyQty: 0,
          deliveredQty: 0,
        }).returning();

        for (let i = 0; i < subOrders.length; i++) {
          const so = subOrders[i];
          await tx.insert(subOrdersTable).values({
            invoiceId: inv.id,
            shopId: user.shopId!,
            profileId: so.profileId,
            subOrderNumber: `${invNum}-${i + 1}`,
            quantity: so.quantity,
            fabricSource: so.fabricSource,
            fabricDescription: so.fabricDescription ?? null,
            price: so.price.toString(),
            paidAmount: so.paidAmount.toString(),
            notes: so.notes ?? null,
            status: "under_tailoring",
          });
        }

        return inv;
      });
      break;
    } catch (err: any) {
      if (isUniqueConstraintError(err) && attempt < MAX_RETRIES - 1) continue;
      if (isUniqueConstraintError(err)) {
        res.status(409).json({ error: "تعذّر توليد رقم فاتورة فريد، يرجى المحاولة مرة أخرى" });
        return;
      }
      throw err;
    }
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

// ─── Complete Stage (with partial qty support) ─────────────────────────────
router.post("/shop/invoices/:invoiceId/complete-stage", requireAuth, requireShopRole("tailor", "shop_manager"), requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  if (!invoice.currentStage) {
    res.status(400).json({ error: "لا توجد مرحلة نشطة لهذه الفاتورة حالياً" });
    return;
  }

  if (user.role === 'tailor') {
    const [tailorUser] = await db.select({ tailorRoles: usersTable.tailorRoles })
      .from(usersTable).where(eq(usersTable.id, user.id));
    if (!tailorUser?.tailorRoles?.includes(invoice.currentStage)) {
      res.status(403).json({ error: "ليس لديك صلاحية إنهاء هذه المرحلة" });
      return;
    }
  }

  // Compute quantity availability
  const subOrders = await db.select({ quantity: subOrdersTable.quantity })
    .from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, id)));
  const totalQty = subOrders.reduce((s, so) => s + so.quantity, 0);
  const inProgressQty = Math.max(0, totalQty - (invoice.readyQty ?? 0) - (invoice.deliveredQty ?? 0));
  const alreadyProcessed = invoice.qtyProcessed ?? 0;
  const availableAtStage = Math.max(0, inProgressQty - alreadyProcessed);

  if (availableAtStage <= 0) {
    res.status(400).json({ error: "لا توجد قطع متاحة لإنهاء هذه المرحلة" });
    return;
  }

  // Parse requested qty — default = complete all available (backward compat)
  const rawQty = req.body.qty != null ? parseInt(req.body.qty, 10) : availableAtStage;
  if (!rawQty || rawQty <= 0 || rawQty > availableAtStage) {
    res.status(400).json({ error: `الكمية غير صالحة. المتاح: ${availableAtStage}` });
    return;
  }
  const completedQty = rawQty;

  const activeStages = await getActiveStages(user.shopId!);
  const expectedStage = invoice.currentStage!;
  const nextStage = getNextStage(expectedStage, activeStages);
  const isLastStage = !nextStage;

  let transactionResult: { updated: any; isReady: boolean; isPartial: boolean };
  try {
    transactionResult = await db.transaction(async (tx) => {
      const [locked] = await tx.select()
        .from(invoicesTable)
        .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)))
        .for('update');

      if (!locked || locked.currentStage !== expectedStage) {
        const err: any = new Error("تم إنهاء هذه المرحلة مسبقاً");
        err.code = 'STAGE_ALREADY_COMPLETED';
        throw err;
      }

      // Re-compute inside transaction with locked data
      const lockedAvailable = Math.max(0, inProgressQty - (locked.qtyProcessed ?? 0));
      if (completedQty > lockedAvailable) {
        const err: any = new Error(`الكمية المطلوبة (${completedQty}) تتجاوز المتاح (${lockedAvailable})`);
        err.code = 'QTY_EXCEEDED';
        throw err;
      }

      await tx.insert(stageHistoryTable).values({
        invoiceId: id,
        shopId: user.shopId!,
        stage: expectedStage,
        completedBy: user.id,
        nextStage: isLastStage ? null : nextStage,
        qty: completedQty,
      });

      const newQtyProcessed = (locked.qtyProcessed ?? 0) + completedQty;
      const newReadyQty = isLastStage ? (locked.readyQty ?? 0) + completedQty : (locked.readyQty ?? 0);
      const allPiecesCompletedStage = newQtyProcessed >= inProgressQty;

      const updateObj: any = {
        qtyProcessed: newQtyProcessed,
        readyQty: newReadyQty,
      };

      if (allPiecesCompletedStage) {
        if (nextStage) {
          updateObj.currentStage = nextStage;
          updateObj.qtyProcessed = 0;
        } else {
          updateObj.currentStage = null;
          updateObj.qtyProcessed = 0;
        }
      }

      // Check if ALL pieces are now accounted for (ready + delivered = total)
      const newInProgressQty = Math.max(0, totalQty - newReadyQty - (locked.deliveredQty ?? 0));
      let isReady = false;
      if (newInProgressQty === 0 && newReadyQty > 0) {
        updateObj.status = 'ready';
        updateObj.allSubOrdersReady = true;
        isReady = true;
        // Mark sub-orders ready
        await tx.update(subOrdersTable)
          .set({ status: 'ready' })
          .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, id)));
      }

      const [upd] = await tx.update(invoicesTable)
        .set(updateObj)
        .where(eq(invoicesTable.id, id))
        .returning();

      return { updated: upd, isReady, isPartial: !allPiecesCompletedStage };
    });
  } catch (err: any) {
    if (err.code === 'STAGE_ALREADY_COMPLETED') {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.code === 'QTY_EXCEEDED') {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const result = await buildInvoiceResponse(user.shopId!, transactionResult.updated);
  res.json({
    ...result,
    completedQty,
    moved: !transactionResult.isReady && !transactionResult.isPartial,
    isPartial: transactionResult.isPartial,
    nextStage: !transactionResult.isPartial ? (nextStage ?? null) : null,
    isReady: transactionResult.isReady,
  });
});

router.patch("/shop/invoices/:invoiceId", isManagerOrReception, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const updateData: Record<string, any> = {};
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;
  if (req.body.bookNumber !== undefined) updateData.bookNumber = req.body.bookNumber || null;
  if (req.body.pageNumber !== undefined) updateData.pageNumber = req.body.pageNumber || null;

  const [invoice] = await db.update(invoicesTable)
    .set(updateData)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  const result = await buildInvoiceResponse(user.shopId!, invoice);
  res.json(result);
});

// ─── Deliver (partial delivery support) ────────────────────────────────────
router.post("/shop/invoices/:invoiceId/deliver", isManagerOrReception, requireActiveShop, async (req, res): Promise<void> => {
  const user = (req as any).user as AuthUser;
  const id = parseInt(Array.isArray(req.params.invoiceId) ? req.params.invoiceId[0] : req.params.invoiceId, 10);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.shopId, user.shopId!), eq(invoicesTable.id, id)));

  if (!invoice) {
    res.status(404).json({ error: "الفاتورة غير موجودة" });
    return;
  }

  const readyQty = invoice.readyQty ?? 0;
  if (readyQty <= 0) {
    res.status(400).json({ error: "لا توجد قطع جاهزة للتسليم" });
    return;
  }

  const subOrders = await db.select({ quantity: subOrdersTable.quantity })
    .from(subOrdersTable)
    .where(and(eq(subOrdersTable.shopId, user.shopId!), eq(subOrdersTable.invoiceId, id)));
  const totalQty = subOrders.reduce((s, so) => s + so.quantity, 0);

  const rawQty = req.body.qty != null ? parseInt(req.body.qty, 10) : readyQty;
  if (!rawQty || rawQty <= 0 || rawQty > readyQty) {
    res.status(400).json({ error: `الكمية غير صالحة. الجاهز للتسليم: ${readyQty}` });
    return;
  }
  const deliverQty = rawQty;

  const newDeliveredQty = (invoice.deliveredQty ?? 0) + deliverQty;
  const newReadyQty = readyQty - deliverQty;
  const isFullyDelivered = newDeliveredQty >= totalQty;

  const updateData: any = {
    deliveredQty: newDeliveredQty,
    readyQty: newReadyQty,
  };

  if (isFullyDelivered) {
    updateData.status = 'delivered';
    updateData.deliveredAt = new Date();
    updateData.allSubOrdersReady = false;
  }

  const [updated] = await db.update(invoicesTable)
    .set(updateData)
    .where(eq(invoicesTable.id, id))
    .returning();

  const result = await buildInvoiceResponse(user.shopId!, updated);
  res.json({ ...result, deliveredQty: deliverQty, isFullyDelivered });
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

  if ((invoice.readyQty ?? 0) <= 0 && invoice.status !== 'ready') {
    res.status(400).json({ error: "لا توجد قطع جاهزة للتسليم" });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(eq(customersTable.id, invoice.customerId));
  const [shop] = await db.select().from(shopsTable)
    .where(eq(shopsTable.id, user.shopId!));

  const subOrders = await getSubOrdersForInvoice(user.shopId!, id);
  const totalQty = subOrders.reduce((s, so) => s + so.quantity, 0);
  const totalAmount = subOrders.reduce((s, so) => s + so.price, 0);
  const paidAmount = subOrders.reduce((s, so) => s + so.paidAmount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const readyQty = invoice.readyQty ?? 0;

  const customerName = customer?.name ?? "عميلنا الكريم";
  const shopName = shop?.name ?? "محلنا";
  const phone = customer?.phone ?? "";

  const bookRef = invoice.bookNumber ? `\nدفتر: ${invoice.bookNumber}${invoice.pageNumber ? ' / صفحة: ' + invoice.pageNumber : ''}` : '';
  const partialNote = readyQty < totalQty ? `\nالجاهز للاستلام: ${readyQty} من ${totalQty}` : '';

  const message =
`السلام عليكم ${customerName} 🌿
خياطة ${shopName}

طلبك جاهز للاستلام ✅${bookRef}${partialNote}
الكمية: ${readyQty < totalQty ? readyQty : totalQty} دشداشة
الإجمالي: ${totalAmount.toFixed(3)} د.ك
المدفوع: ${paidAmount.toFixed(3)} د.ك
المتبقي: ${remainingAmount > 0 ? remainingAmount.toFixed(3) + ' د.ك' : 'لا يوجد متبقي ✓'}

حياك تقدر تسلم طلبك في أي وقت 🙏`;

  res.json({ message, phone, invoiceNumber: invoice.invoiceNumber, remainingAmount });
});

router.get('/shop/invoices/:id/history', isShopUser, requireActiveShop, async (req, res) => {
  const user = req.user as AuthUser;
  const id = parseInt(req.params.id);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.shopId, user.shopId!)));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const history = await db.select().from(invoiceHistoryTable)
    .where(eq(invoiceHistoryTable.invoiceId, id))
    .orderBy(desc(invoiceHistoryTable.changedAt));

  res.json(history);
});

router.post('/shop/invoices/:id/history', isManagerOrReception, requireActiveShop, async (req, res) => {
  const user = req.user as AuthUser;
  const id = parseInt(req.params.id);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.shopId, user.shopId!)));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { changes } = req.body;
  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  const [entry] = await db.insert(invoiceHistoryTable).values({
    invoiceId: id,
    shopId: user.shopId!,
    changedByUsername: (user as any).username ?? null,
    changes,
  }).returning();

  res.json(entry);
});

// ─── Stage Movement History ────────────────────────────────────────────────
router.get('/shop/invoices/:id/stage-history', isShopUser, requireActiveShop, async (req, res) => {
  const user = req.user as AuthUser;
  const id = parseInt(req.params.id);

  const [invoice] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.shopId, user.shopId!)));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const history = await db
    .select({
      id: stageHistoryTable.id,
      stage: stageHistoryTable.stage,
      nextStage: stageHistoryTable.nextStage,
      qty: stageHistoryTable.qty,
      completedAt: stageHistoryTable.completedAt,
      completedByName: usersTable.name,
    })
    .from(stageHistoryTable)
    .leftJoin(usersTable, eq(stageHistoryTable.completedBy, usersTable.id))
    .where(and(eq(stageHistoryTable.invoiceId, id), eq(stageHistoryTable.shopId, user.shopId!)))
    .orderBy(desc(stageHistoryTable.completedAt));

  res.json(history);
});

export default router;
