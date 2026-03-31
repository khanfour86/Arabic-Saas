import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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
