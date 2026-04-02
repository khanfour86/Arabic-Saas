import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  managerName: text("manager_name").notNull(),
  phone: text("phone").notNull(),
  governorate: text("governorate"),
  area: text("area").notNull(),
  subscriptionStart: date("subscription_start").notNull(),
  subscriptionEnd: date("subscription_end").notNull(),
  subscriptionStatus: text("subscription_status").notNull().default("active"),
  plan: text("plan").notNull().default("premium"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
