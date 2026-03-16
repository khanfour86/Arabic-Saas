import { db, shopsTable, usersTable, customersTable, profilesTable, measurementsTable, invoicesTable, subOrdersTable } from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "tailoring_salt_2024").digest("hex");
}

async function seed() {
  console.log("بدء إدراج البيانات التجريبية...");

  const existingOwner = await db.select().from(usersTable).then(rows => rows.find(r => r.role === "owner"));
  if (existingOwner) {
    console.log("البيانات التجريبية موجودة مسبقاً");
    return;
  }

  await db.insert(usersTable).values({
    shopId: null,
    username: "owner",
    passwordHash: hashPassword("owner123"),
    name: "مالك المنصة",
    role: "owner",
  });
  console.log("تم إنشاء حساب المالك");

  const today = new Date();
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const todayStr = today.toISOString().split("T")[0];
  const nextYearStr = nextYear.toISOString().split("T")[0];

  const [shop1] = await db.insert(shopsTable).values({
    name: "محل الكويت للدشاديش",
    managerName: "أحمد محمد العتيبي",
    phone: "50001234",
    area: "الكويت",
    subscriptionStart: todayStr,
    subscriptionEnd: nextYearStr,
    subscriptionStatus: "active",
    notes: "محل رئيسي في منطقة الكويت",
  }).returning();

  const [shop2] = await db.insert(shopsTable).values({
    name: "محل الخيوط الذهبية",
    managerName: "خالد عبدالله الشمري",
    phone: "55009876",
    area: "حولي",
    subscriptionStart: todayStr,
    subscriptionEnd: nextYearStr,
    subscriptionStatus: "active",
    notes: "محل متخصص في الأقمشة الفاخرة",
  }).returning();

  const [shop3] = await db.insert(shopsTable).values({
    name: "محل النخبة للخياطة",
    managerName: "سالم يوسف الرشيدي",
    phone: "66001122",
    area: "الفروانية",
    subscriptionStart: todayStr,
    subscriptionEnd: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split("T")[0],
    subscriptionStatus: "expired",
    notes: "بانتظار تجديد الاشتراك",
  }).returning();

  await db.insert(usersTable).values([
    {
      shopId: shop1.id,
      username: "manager1",
      passwordHash: hashPassword("manager123"),
      name: "أحمد محمد العتيبي",
      role: "shop_manager",
    },
    {
      shopId: shop1.id,
      username: "reception1",
      passwordHash: hashPassword("reception123"),
      name: "فاطمة علي الحربي",
      role: "reception",
    },
    {
      shopId: shop1.id,
      username: "tailor1",
      passwordHash: hashPassword("tailor123"),
      name: "محمد صالح المطيري",
      role: "tailor",
    },
    {
      shopId: shop2.id,
      username: "manager2",
      passwordHash: hashPassword("manager123"),
      name: "خالد عبدالله الشمري",
      role: "shop_manager",
    },
    {
      shopId: shop3.id,
      username: "manager3",
      passwordHash: hashPassword("manager123"),
      name: "سالم يوسف الرشيدي",
      role: "shop_manager",
    },
  ]);
  console.log("تم إنشاء المستخدمين");

  const [cust1] = await db.insert(customersTable).values({
    shopId: shop1.id,
    phone: "50011111",
    name: "عبدالله ناصر الكندري",
    notes: "عميل مميز",
  }).returning();

  const [cust2] = await db.insert(customersTable).values({
    shopId: shop1.id,
    phone: "55022222",
    name: "فيصل حمد السبيعي",
    notes: "",
  }).returning();

  const [cust3] = await db.insert(customersTable).values({
    shopId: shop1.id,
    phone: "66033333",
    name: "سعود عبدالرحمن العازمي",
    notes: "يفضل القماش الأبيض دائماً",
  }).returning();

  const [profile1Main] = await db.insert(profilesTable).values({
    customerId: cust1.id,
    shopId: shop1.id,
    name: "عبدالله ناصر الكندري",
    isMain: true,
  }).returning();

  const [profile1Child1] = await db.insert(profilesTable).values({
    customerId: cust1.id,
    shopId: shop1.id,
    name: "محمد عبدالله الكندري",
    isMain: false,
    notes: "الابن الأكبر",
  }).returning();

  const [profile1Child2] = await db.insert(profilesTable).values({
    customerId: cust1.id,
    shopId: shop1.id,
    name: "خالد عبدالله الكندري",
    isMain: false,
    notes: "الابن الأصغر",
  }).returning();

  const [profile2Main] = await db.insert(profilesTable).values({
    customerId: cust2.id,
    shopId: shop1.id,
    name: "فيصل حمد السبيعي",
    isMain: true,
  }).returning();

  const [profile3Main] = await db.insert(profilesTable).values({
    customerId: cust3.id,
    shopId: shop1.id,
    name: "سعود عبدالرحمن العازمي",
    isMain: true,
  }).returning();

  await db.insert(measurementsTable).values([
    {
      profileId: profile1Main.id,
      length: "58",
      shoulder: "48",
      chest: "118",
      sleeve: "64",
      neck: "42",
      modelNotes: "ياقة مدورة",
      generalNotes: "",
    },
    {
      profileId: profile1Child1.id,
      length: "52",
      shoulder: "44",
      chest: "104",
      sleeve: "60",
      neck: "39",
      modelNotes: "",
      generalNotes: "طفل 15 سنة",
    },
    {
      profileId: profile1Child2.id,
      length: "46",
      shoulder: "40",
      chest: "92",
      sleeve: "54",
      neck: "36",
      modelNotes: "",
      generalNotes: "طفل 10 سنوات",
    },
    {
      profileId: profile2Main.id,
      length: "56",
      shoulder: "46",
      chest: "112",
      sleeve: "62",
      neck: "40",
      modelNotes: "كم واسع",
      generalNotes: "",
    },
    {
      profileId: profile3Main.id,
      length: "60",
      shoulder: "50",
      chest: "124",
      sleeve: "66",
      neck: "44",
      modelNotes: "طوق عريض",
      generalNotes: "يفضل قماش الشتاء",
    },
  ]);
  console.log("تم إنشاء العملاء والقياسات");

  const [inv1] = await db.insert(invoicesTable).values({
    shopId: shop1.id,
    customerId: cust1.id,
    invoiceNumber: "1001",
    status: "under_tailoring",
    notes: "عجل إذا ممكن",
    allSubOrdersReady: false,
  }).returning();

  await db.insert(subOrdersTable).values([
    {
      invoiceId: inv1.id,
      shopId: shop1.id,
      profileId: profile1Main.id,
      subOrderNumber: "1001-1",
      quantity: 2,
      fabricSource: "shop_fabric",
      fabricDescription: "قماش أبيض ناعم",
      price: "35.000",
      paidAmount: "20.000",
      notes: "",
      status: "under_tailoring",
    },
    {
      invoiceId: inv1.id,
      shopId: shop1.id,
      profileId: profile1Child1.id,
      subOrderNumber: "1001-2",
      quantity: 1,
      fabricSource: "customer_fabric",
      fabricDescription: "قماش مريول أزرق",
      price: "18.000",
      paidAmount: "18.000",
      notes: "قماش العميل في الكيس الأزرق",
      status: "ready",
    },
    {
      invoiceId: inv1.id,
      shopId: shop1.id,
      profileId: profile1Child2.id,
      subOrderNumber: "1001-3",
      quantity: 1,
      fabricSource: "shop_fabric",
      fabricDescription: "قماش أبيض",
      price: "15.000",
      paidAmount: "0.000",
      notes: "",
      status: "under_tailoring",
    },
  ]);

  const [inv2] = await db.insert(invoicesTable).values({
    shopId: shop1.id,
    customerId: cust2.id,
    invoiceNumber: "1002",
    status: "ready",
    notes: "",
    allSubOrdersReady: true,
  }).returning();

  await db.insert(subOrdersTable).values([
    {
      invoiceId: inv2.id,
      shopId: shop1.id,
      profileId: profile2Main.id,
      subOrderNumber: "1002-1",
      quantity: 3,
      fabricSource: "shop_fabric",
      fabricDescription: "قماش ناعم فاخر",
      price: "90.000",
      paidAmount: "50.000",
      notes: "",
      status: "ready",
    },
  ]);

  const [inv3] = await db.insert(invoicesTable).values({
    shopId: shop1.id,
    customerId: cust3.id,
    invoiceNumber: "1003",
    status: "delivered",
    notes: "",
    allSubOrdersReady: true,
    deliveredAt: new Date(),
  }).returning();

  await db.insert(subOrdersTable).values([
    {
      invoiceId: inv3.id,
      shopId: shop1.id,
      profileId: profile3Main.id,
      subOrderNumber: "1003-1",
      quantity: 2,
      fabricSource: "customer_fabric",
      fabricDescription: "قماش صوف",
      price: "45.000",
      paidAmount: "45.000",
      notes: "تم التسليم",
      status: "ready",
    },
  ]);

  console.log("تم إنشاء الفواتير والطلبات الفرعية");
  console.log("\n✅ تم إدراج البيانات التجريبية بنجاح!\n");
  console.log("بيانات الدخول:");
  console.log("  المالك: owner / owner123");
  console.log("  مدير المحل: manager1 / manager123");
  console.log("  الاستقبال: reception1 / reception123");
  console.log("  الخياط: tailor1 / tailor123");

  process.exit(0);
}

seed().catch((e) => {
  console.error("خطأ في إدراج البيانات:", e);
  process.exit(1);
});
