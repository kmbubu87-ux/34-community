import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ execute: vi.fn(), transaction: vi.fn() }));
vi.mock("../../src/db/client", () => ({ getDb: () => mock }));
import { recordAutumnPrayer } from "../../src/features/autumn/service";
import { decryptAutumnEntries, encryptAutumnEntries } from "../../src/features/autumn/crypto";
import { seoulToday } from "../../src/features/pastoral/policy";
describe("autumn storage", () => {
  beforeEach(() => { vi.resetAllMocks(); mock.transaction.mockImplementation(fn => fn(mock)); });
  it("refuses participation after the campaign is hidden", async () => { mock.execute.mockResolvedValueOnce({ rows: [{ enabled: false }] }); await expect(recordAutumnPrayer("member")).rejects.toMatchObject({ code: "AUTUMN_CLOSED" }); expect(mock.execute).toHaveBeenCalledTimes(1); });
  it("encrypts data with authenticated encryption and detects tampering", () => { const key = Buffer.alloc(32, 11).toString("base64"); const value = encryptAutumnEntries("private prayer", key); expect(value).not.toContain("private prayer"); expect(decryptAutumnEntries(value, key)).toBe("private prayer"); const parts = value.split("."); parts[3] = Buffer.from("tampered").toString("base64url"); expect(() => decryptAutumnEntries(parts.join("."), key)).toThrow(); });
  it("uses Seoul's new day at the UTC boundary", () => { expect(seoulToday(new Date("2026-10-07T14:59:59Z"))).toBe("2026-10-07"); expect(seoulToday(new Date("2026-10-07T15:00:00Z"))).toBe("2026-10-08"); });
});
