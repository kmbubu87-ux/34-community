import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { memberRoster, users } from "../../db/schema";

// Approval is stored by roster ID and rechecked for every login/session.
// Officer approval does not grant administrator or pastoral-report access.
export async function isApprovedOfficer(userId: string): Promise<boolean> {
  const [row] = await getDb().select({ role: memberRoster.officerRole })
    .from(users).innerJoin(memberRoster, eq(users.rosterId, memberRoster.id))
    .where(and(eq(users.id, userId), eq(users.isActive, true), eq(memberRoster.isActive, true)))
    .limit(1);
  return row?.role === "treasurer";
}
