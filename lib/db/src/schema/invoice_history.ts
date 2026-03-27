import { pgTable, serial, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { shopsTable } from "./shops";

export const invoiceHistoryTable = pgTable("invoice_history", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  changedByUsername: text("changed_by_username"),
  changes: jsonb("changes").notNull(),
});

export type InvoiceHistory = typeof invoiceHistoryTable.$inferSelect;
