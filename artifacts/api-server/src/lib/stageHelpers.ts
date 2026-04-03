import { db, usersTable, stageHistoryTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export const STAGE_ORDER = ['cutting', 'assembly', 'finishing', 'ironing'] as const;
export type TailorStage = typeof STAGE_ORDER[number];

export const STAGE_LABEL_AR: Record<string, string> = {
  cutting: 'قصاص',
  assembly: 'تركيب',
  finishing: 'تشطيب',
  ironing: 'كوي',
};

export async function getActiveStages(shopId: number): Promise<string[]> {
  const tailors = await db.select({ tailorRoles: usersTable.tailorRoles })
    .from(usersTable)
    .where(and(eq(usersTable.shopId, shopId), eq(usersTable.role, 'tailor')));

  const allRoles = new Set<string>();
  for (const t of tailors) {
    if (t.tailorRoles) {
      for (const role of t.tailorRoles) {
        allRoles.add(role);
      }
    }
  }
  return STAGE_ORDER.filter(s => allRoles.has(s));
}

export function getNextStage(currentStage: string, activeStages: string[]): string | null {
  const idx = activeStages.indexOf(currentStage);
  if (idx === -1 || idx === activeStages.length - 1) return null;
  return activeStages[idx + 1];
}

/**
 * Calculate how many pieces are waiting at each active stage for a single invoice.
 *
 * Formula:
 *   piecesAtStage[0]  = totalQty - completedAtStage[0]
 *   piecesAtStage[i]  = completedAtStage[i-1] - completedAtStage[i]   (for i > 0)
 *
 * This is derived directly from the stage history, so pieces move forward
 * as soon as any batch completes a stage — no waiting for the full quantity.
 */
export function computeStageCounts(
  totalQty: number,
  activeStages: string[],
  completedPerStage: Record<string, number>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < activeStages.length; i++) {
    const stage = activeStages[i];
    const entered = i === 0 ? totalQty : (completedPerStage[activeStages[i - 1]] ?? 0);
    const exited = completedPerStage[stage] ?? 0;
    counts[stage] = Math.max(0, entered - exited);
  }
  return counts;
}

/**
 * Given stage counts, return the earliest active stage that has pieces waiting.
 * Returns null if no stages have pieces (all pieces are done / ready / delivered).
 */
export function getEarliestActiveStage(
  counts: Record<string, number>,
  activeStages: string[]
): string | null {
  for (const stage of activeStages) {
    if ((counts[stage] ?? 0) > 0) return stage;
  }
  return null;
}

/**
 * Fetch history-based completed qty per stage for a single invoice.
 * Can optionally use a transaction client.
 */
export async function fetchCompletedPerStage(
  invoiceId: number,
  txClient?: typeof db
): Promise<Record<string, number>> {
  const client = txClient ?? db;
  const rows = await client.select({ stage: stageHistoryTable.stage, qty: stageHistoryTable.qty })
    .from(stageHistoryTable)
    .where(eq(stageHistoryTable.invoiceId, invoiceId));

  const map: Record<string, number> = {};
  for (const row of rows) {
    if (row.qty) map[row.stage] = (map[row.stage] ?? 0) + row.qty;
  }
  return map;
}

/**
 * Batch-fetch completed qty per stage for multiple invoices.
 * Returns a map: invoiceId -> { stage -> totalCompleted }
 */
export async function fetchCompletedPerStageBatch(
  invoiceIds: number[]
): Promise<Map<number, Record<string, number>>> {
  const result = new Map<number, Record<string, number>>();
  if (invoiceIds.length === 0) return result;

  const rows = await db.select({
    invoiceId: stageHistoryTable.invoiceId,
    stage: stageHistoryTable.stage,
    qty: stageHistoryTable.qty,
  })
    .from(stageHistoryTable)
    .where(inArray(stageHistoryTable.invoiceId, invoiceIds));

  for (const row of rows) {
    if (!result.has(row.invoiceId)) result.set(row.invoiceId, {});
    const m = result.get(row.invoiceId)!;
    if (row.qty) m[row.stage] = (m[row.stage] ?? 0) + row.qty;
  }

  return result;
}
