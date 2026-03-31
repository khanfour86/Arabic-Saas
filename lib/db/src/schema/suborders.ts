import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { invoicesTable } from "./invoices";
import { profilesTable } from "./profiles";
import { shopsTable } from "./shops";

export const subOrdersTable = pgTable("sub_orders", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id),
  subOrderNumber: text("sub_order_number").notNull(),
  quantity: integer("quantity").notNull().default(1),
  fabricSource: text("fabric_source").notNull().default("shop_fabric"),
  fabricDescription: text("fabric_description"),
  price: numeric("price", { precision: 10, scale: 3 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 3 }).notNull().default("0"),
  notes: text("notes"),
  status: text("status").notNull().default("under_tailoring"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("sub_orders_shop_invoice_number_unique").on(t.shopId, t.invoiceId, t.subOrderNumber),
]);

export const insertSubOrderSchema = createInsertSchema(subOrdersTable).omit({ id: true, createdAt: true });
export type InsertSubOrder = z.infer<typeof insertSubOrderSchema>;
export type SubOrder = typeof subOrdersTable.$inferSelect;
