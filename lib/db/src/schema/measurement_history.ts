import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { customersTable } from "./customers";
import { shopsTable } from "./shops";

export const measurementHistoryTable = pgTable("measurement_history", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  length: numeric("length", { precision: 5, scale: 2 }),
  shoulder: numeric("shoulder", { precision: 5, scale: 2 }),
  chest: numeric("chest", { precision: 5, scale: 2 }),
  sleeve: numeric("sleeve", { precision: 5, scale: 2 }),
  neck: numeric("neck", { precision: 5, scale: 2 }),
  modelNotes: text("model_notes"),
  generalNotes: text("general_notes"),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MeasurementHistory = typeof measurementHistoryTable.$inferSelect;
