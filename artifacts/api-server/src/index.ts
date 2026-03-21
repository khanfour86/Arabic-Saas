import app from "./app";
import { seedDatabase } from "./lib/seed";
import { db, customersTable, profilesTable } from "@workspace/db";
import { eq, and, not, exists, sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function migrateProofProfiles(): Promise<void> {
  try {
    // Find all customers who don't have a بروفا (isProof = true) profile yet
    const customersWithoutProof = await db
      .selectDistinct({ id: customersTable.id, shopId: customersTable.shopId })
      .from(customersTable)
      .where(
        not(
          exists(
            db
              .select({ id: profilesTable.id })
              .from(profilesTable)
              .where(
                and(
                  eq(profilesTable.customerId, customersTable.id),
                  eq(profilesTable.isProof, true),
                )
              )
          )
        )
      );

    if (customersWithoutProof.length === 0) {
      console.log("[migrate] All customers already have a تجربه profile — skipping");
    } else {
      const proofProfiles = customersWithoutProof.map(c => ({
        customerId: c.id,
        shopId: c.shopId,
        name: 'تجربه',
        isMain: false,
        isProof: true,
      }));

      await db.insert(profilesTable).values(proofProfiles);
      console.log(`[migrate] ✓ Created تجربه profiles for ${proofProfiles.length} customers`);
    }

    // Rename any old 'بروفا' proof profiles to 'تجربه'
    await db.update(profilesTable)
      .set({ name: 'تجربه' })
      .where(and(eq(profilesTable.isProof, true), eq(profilesTable.name, 'بروفا')));
    console.log("[migrate] ✓ Renamed old 'بروفا' profiles to 'تجربه'");
  } catch (err) {
    console.error("[migrate] Error in proof profile migration:", err);
  }
}

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await seedDatabase();
  await migrateProofProfiles();
});
