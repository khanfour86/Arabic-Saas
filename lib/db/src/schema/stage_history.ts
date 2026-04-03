import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { invoicesTable } from "./invoices";
import { shopsTable } from "./shops";
import { usersTable } from "./users";

export const stageHistoryTable = pgTable("stage_history", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  stage: text("stage").notNull(),
  completedBy: integer("completed_by").notNull().references(() => usersTable.id),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  nextStage: text("next_stage"),
  qty: integer("qty").notNull().default(1),
});

export const insertStageHistorySchema = createInsertSchema(stageHistoryTable).omit({ id: true, completedAt: true });
export type InsertStageHistory = z.infer<typeof insertStageHistorySchema>;
export type StageHistory = typeof stageHistoryTable.$inferSelect;
