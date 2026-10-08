import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import {
  MAX_ROSTER_FILE_BYTES,
  importRosterUploadBuffer,
  validateRosterUploadMeta,
} from "../../src/features/admin/roster-import-service";

function workbookBuffer() {
  const sheet = utils.aoa_to_sheet([
    ["이름", "교회직분", "핸드폰", "마을", "샘"],
    ["관리자A", "부목사", "010-1234-5678", "1마을", "06샘"],
    ["회원B", "집사", "010-9999-0000", "2마을", "03샘"],
  ]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "명단");
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xls" }));
}

describe("admin roster upload boundary", () => {
  it("accepts a legacy xls within the size limit", () => {
    expect(() =>
      validateRosterUploadMeta({ name: "56공동체.xls", size: 74240 }),
    ).not.toThrow();
  });

  it("accepts xlsx templates and rejects other files and oversized uploads", () => {
    expect(() =>
      validateRosterUploadMeta({ name: "roster.xlsx", size: 1000 }),
    ).not.toThrow();
    expect(() =>
      validateRosterUploadMeta({ name: "roster.csv", size: 1000 }),
    ).toThrow("ROSTER_FILE_TYPE");
    expect(() =>
      validateRosterUploadMeta({
        name: "roster.xls",
        size: MAX_ROSTER_FILE_BYTES + 1,
      }),
    ).toThrow("ROSTER_FILE_TOO_LARGE");
  });

  it("adds a partial roster without requiring the logged-in administrator", async () => {
    process.env.DATABASE_URL = "postgres://example";
    process.env.SESSION_SECRET = "s".repeat(32);
    process.env.PHONE_LOOKUP_PEPPER = "p".repeat(32);
    process.env.ROSTER_ENCRYPTION_KEY = Buffer.alloc(32, 12).toString("base64");

    const prepared: Array<{ isAdmin: boolean; samLabel: string | null }> = [];
    const summary = await importRosterUploadBuffer({
      buffer: workbookBuffer(),
      repository: {
        appendRows: async (rows) => {
          prepared.push(...rows);
          return { added: rows.length, skipped: 0 };
        },
      },
    });

    expect(summary).toEqual({
      total: 2,
      imported: 2,
      skipped: 0,
      missingPhone: 0,
      errors: 0,
    });
    expect(prepared[0]).toMatchObject({ isAdmin: false, samLabel: "1-6" });
    expect(prepared[1]).toMatchObject({ isAdmin: false, samLabel: "2-3" });
  });
});
