import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const measurementsTable = pgTable("measurements", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().unique().references(() => profilesTable.id),
  length: numeric("length", { precision: 5, scale: 2 }),
  shoulder: numeric("shoulder", { precision: 5, scale: 2 }),
  chest: numeric("chest", { precision: 5, scale: 2 }),
  sleeve: numeric("sleeve", { precision: 5, scale: 2 }),
  neck: numeric("neck", { precision: 5, scale: 2 }),
  modelNotes: text("model_notes"),
  generalNotes: text("general_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMeasurementsSchema = createInsertSchema(measurementsTable).omit({ id: true });
export type InsertMeasurements = z.infer<typeof insertMeasurementsSchema>;
export type Measurements = typeof measurementsTable.$inferSelect;
