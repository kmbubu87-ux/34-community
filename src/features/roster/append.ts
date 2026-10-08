import { sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { memberRoster } from "../../db/schema";
import { phoneLookupHash } from "../auth/crypto";
import { reconcileUnboundLeaders } from "../sams/identity-service";
import { encryptRosterPhone } from "./crypto";
import { validateRosterCandidates, type ImportCandidate, type PreparedRosterRow } from "./import";

export type AppendRosterRepository = {
  appendRows(rows: PreparedRosterRow[]): Promise<{ added: number; skipped: number }>;
};

export const dbAppendRosterRepository: AppendRosterRepository = {
  async appendRows(rows) {
    return getDb().transaction(async (tx) => {
      // Serialize imports so a repeated upload cannot create duplicate identities.
      await tx.execute(sql`select pg_advisory_xact_lock(34081001)`);
      const existing = await tx.select().from(memberRoster);
      let added = 0;
      let skipped = 0;
      for (const row of rows) {
        const exact = existing.find((person) => person.canonicalName === row.canonicalName && person.phoneLookupHash === row.phoneLookupHash);
        // A name-only existing identity needs an explicit admin edit, never a second account.
        const nameOnly = existing.find((person) => person.canonicalName === row.canonicalName && (!person.phoneLookupHash || !row.phoneLookupHash));
        if (exact || nameOnly) { skipped += 1; continue; }
        const [inserted] = await tx.insert(memberRoster).values(row).returning();
        existing.push(inserted);
        added += 1;
      }
      await reconcileUnboundLeaders(tx);
      return { added, skipped };
    });
  },
};

export async function appendRosterCandidates(rows: ImportCandidate[], repository: AppendRosterRepository = dbAppendRosterRepository) {
  const validation = validateRosterCandidates(rows);
  if (!rows.length || validation.errors.length) throw new Error("ROSTER_VALIDATION_FAILED");
  const prepared: PreparedRosterRow[] = rows.map((row) => ({
    sourceRow: row.sourceRow, sourceName: row.sourceName, canonicalName: row.canonicalName,
    position: row.position, village: row.village, sam: row.sam, samLabel: row.samLabel,
    phoneLookupHash: row.phone ? phoneLookupHash(row.phone) : null,
    phoneCiphertext: row.phone ? encryptRosterPhone(row.phone) : null,
    isActive: true, isAdmin: false, source: "xls",
  }));
  const result = await repository.appendRows(prepared);
  return { total: rows.length, imported: result.added, skipped: result.skipped, missingPhone: validation.missingPhone, errors: 0 };
}
