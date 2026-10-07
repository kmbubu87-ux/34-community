import { sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { decryptAutumnEntries } from "./crypto";
import { DomainError } from "../../lib/http";
import { seoulToday } from "../pastoral/policy";
import type { SessionUser } from "../auth/session";

export type AutumnEntry = { sam: string; pledger: string; target: string; relationship: string; prayer: string };
export async function autumnEnabled(): Promise<boolean> {
  const result = await getDb().execute(sql`select enabled from prayer_app.autumn_campaign where id='2026'`);
  return result.rows[0]?.enabled === true;
}
export async function autumnState(user: SessionUser) {
  const db = getDb();
  const result = await db.execute(sql`select enabled,entries_ciphertext from prayer_app.autumn_campaign where id='2026'`);
  const campaign = result.rows[0];
  if (!campaign || (!campaign.enabled && user.role !== "admin")) throw new DomainError("AUTUMN_CLOSED", 404);
  const today = seoulToday();
  const counts = await db.execute(sql`select count(*)::int as total,coalesce(bool_or(user_id=${user.id}),false) as prayed from prayer_app.autumn_prayers where campaign_id='2026' and prayer_date=${today}`);
  return { enabled: campaign.enabled === true, entries: JSON.parse(decryptAutumnEntries(String(campaign.entries_ciphertext))) as AutumnEntry[], today, prayed: counts.rows[0]?.prayed === true, total: Number(counts.rows[0]?.total ?? 0), admin: user.role === "admin" };
}
export async function recordAutumnPrayer(userId: string) {
  // Lock the campaign so hiding and participation cannot race each other.
  await getDb().transaction(async db => {
    const campaign = await db.execute(sql`select enabled from prayer_app.autumn_campaign where id='2026' for update`);
    if (campaign.rows[0]?.enabled !== true) throw new DomainError("AUTUMN_CLOSED", 404);
    await db.execute(sql`insert into prayer_app.autumn_prayers(campaign_id,user_id,prayer_date) values('2026',${userId},${seoulToday()}) on conflict do nothing`);
  });
}
export async function setAutumnEnabled(enabled: boolean) {
  const result = await getDb().execute(sql`update prayer_app.autumn_campaign set enabled=${enabled},updated_at=now() where id='2026' returning id`);
  if (!result.rows.length) throw new DomainError("AUTUMN_NOT_CONFIGURED", 409);
}
