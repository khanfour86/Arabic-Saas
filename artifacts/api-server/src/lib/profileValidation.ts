import { db, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

/**
 * Validates that a profileId belongs to:
 * 1. The given shopId (cross-shop protection)
 * 2. The given customerId (cross-customer protection within same shop/family)
 *
 * Supports all valid cases:
 * - Main profile for a customer
 * - Proof/trial profile for a customer
 * - Multiple profiles per customer
 *
 * Returns the profile record on success, throws with a descriptive error on failure.
 */
export async function validateProfileOwnership(
  shopId: number,
  customerId: number,
  profileId: number
): Promise<{ id: number; name: string; customerId: number; shopId: number }> {
  const [profile] = await db
    .select({
      id: profilesTable.id,
      name: profilesTable.name,
      customerId: profilesTable.customerId,
      shopId: profilesTable.shopId,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId));

  if (!profile) {
    throw Object.assign(new Error("الملف الشخصي غير موجود"), { statusCode: 404 });
  }

  if (profile.shopId !== shopId) {
    throw Object.assign(new Error("الملف الشخصي لا ينتمي لهذا المحل"), { statusCode: 403 });
  }

  if (profile.customerId !== customerId) {
    throw Object.assign(new Error("الملف الشخصي لا ينتمي لهذا العميل"), { statusCode: 400 });
  }

  return profile;
}
