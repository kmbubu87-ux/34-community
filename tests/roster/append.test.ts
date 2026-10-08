import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ existing: [] as any[], inserts: [] as any[], reconcile: vi.fn() }));
vi.mock("../../src/db/client", () => ({ getDb: () => ({ transaction: async (run: any) => run({
  execute: vi.fn(), select: () => ({ from: async () => [...state.existing] }),
  insert: () => ({ values: (row: any) => ({ returning: async () => { const saved = {...row,id:`new-${state.inserts.length}`}; state.inserts.push(saved); return [saved]; } }) }),
}) }) }));
vi.mock("../../src/features/sams/identity-service", () => ({ reconcileUnboundLeaders: state.reconcile }));
import { appendRosterCandidates } from "../../src/features/roster/append";
import { phoneLookupHash } from "../../src/features/auth/crypto";
const candidate = { sourceRow: 2, sourceName: "새리더", canonicalName: "새리더", position: "집사", phone: "01012345678", village: "1마을", sam: "2샘", samLabel: "1-2" };
beforeEach(() => {
  process.env.PHONE_LOOKUP_PEPPER = "p".repeat(32);
  process.env.SESSION_SECRET = "s".repeat(32);
  process.env.DATABASE_URL = "postgres://example";
  process.env.ROSTER_ENCRYPTION_KEY = Buffer.alloc(32,12).toString("base64");
  state.existing = []; state.inserts = []; state.reconcile.mockClear();
});
describe("additive roster imports", () => {
  it("preserves administrator, officer, village-head accounts and passwords omitted from the file", async () => {
    state.existing = [ {id:"admin",canonicalName:"목사",isAdmin:true,passwordHash:"kept"}, {id:"officer",canonicalName:"총무",officerRole:"treasurer"}, {id:"head",canonicalName:"마을장",samLabel:"1-1"} ];
    const before = structuredClone(state.existing);
    expect(await appendRosterCandidates([candidate])).toMatchObject({imported:1,skipped:0});
    expect(state.existing).toEqual(before);
    expect(state.inserts[0]).toMatchObject({isAdmin:false,isActive:true,samLabel:"1-2"});
    expect(state.reconcile).toHaveBeenCalledOnce();
  });
  it("skips an existing identity regardless of source and keeps its permissions and password", async () => {
    state.existing = [{id:"kept",canonicalName:candidate.canonicalName,phoneLookupHash:phoneLookupHash(candidate.phone),source:"admin",isAdmin:true,passwordHash:"kept"}];
    expect(await appendRosterCandidates([candidate])).toMatchObject({imported:0,skipped:1});
    expect(state.inserts).toEqual([]);
    expect(state.existing[0].passwordHash).toBe("kept");
  });
  it("does not create a second account when the existing name has no phone", async () => {
    state.existing = [{id:"kept",canonicalName:candidate.canonicalName,phoneLookupHash:null}];
    expect(await appendRosterCandidates([candidate])).toMatchObject({imported:0,skipped:1});
  });
  it("keeps distinct namesakes with different phones and rejects duplicate file credentials before writing", async () => {
    state.existing = [{id:"namesake",canonicalName:candidate.canonicalName,phoneLookupHash:phoneLookupHash("01099998888")}];
    expect(await appendRosterCandidates([candidate])).toMatchObject({imported:1});
    state.inserts = [];
    await expect(appendRosterCandidates([candidate,{...candidate,sourceRow:3}])).rejects.toThrow("ROSTER_VALIDATION_FAILED");
    expect(state.inserts).toEqual([]);
  });
});
