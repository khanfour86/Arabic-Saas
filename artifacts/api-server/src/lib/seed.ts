import { db, usersTable, shopsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { hashPassword } from "./auth";

export async function seedDatabase(): Promise<void> {
  try {
    const [{ total }] = await db.select({ total: count() }).from(usersTable);
    if (Number(total) > 0) {
      console.log(`[seed] Database already has ${total} users — skipping seed`);
      return;
    }

    console.log("[seed] Empty database detected — seeding initial data...");

    const ownerShopSubscriptionStart = new Date("2024-01-01");
    const ownerShopSubscriptionEnd = new Date("2025-01-01");

    const [demoShop] = await db
      .insert(shopsTable)
      .values({
        name: "محل الخياطة التجريبي",
        managerName: "أحمد المطيري",
        phone: "55001122",
        area: "السالمية",
        subscriptionStart: ownerShopSubscriptionStart.toISOString().split("T")[0],
        subscriptionEnd: ownerShopSubscriptionEnd.toISOString().split("T")[0],
        subscriptionStatus: "active",
        notes: "محل تجريبي للعرض",
      })
      .returning();

    await db.insert(usersTable).values([
      {
        username: "owner",
        passwordHash: hashPassword("owner123"),
        name: "مالك المنصة",
        role: "owner",
        shopId: null,
      },
      {
        username: "manager1",
        passwordHash: hashPassword("manager123"),
        name: "أحمد المطيري",
        role: "shop_manager",
        shopId: demoShop.id,
      },
      {
        username: "reception1",
        passwordHash: hashPassword("reception123"),
        name: "فاطمة العنزي",
        role: "reception",
        shopId: demoShop.id,
      },
      {
        username: "tailor1",
        passwordHash: hashPassword("tailor123"),
        name: "محمد البلوشي",
        role: "tailor",
        shopId: demoShop.id,
      },
    ]);

    console.log("[seed] ✓ Initial data seeded successfully");
  } catch (err) {
    console.error("[seed] Error seeding database:", err);
  }
}
