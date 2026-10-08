import { NextResponse } from "next/server";
import {
  importRosterUploadBuffer,
  validateRosterUploadMeta,
} from "../../../../../src/features/admin/roster-import-service";
import { requireAdmin } from "../../../../../src/features/admin/service";
import { getCurrentSessionUser } from "../../../../../src/features/auth/http-session";
import { DomainError } from "../../../../../src/lib/http";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ code: error.code }, { status: error.status });
  }

  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "MISSING_ROSTER_ENCRYPTION_KEY") {
    return NextResponse.json({ code }, { status: 503 });
  }
  if (
    code === "ROSTER_VALIDATION_FAILED" ||
    code === "INITIAL_ADMIN_NOT_FOUND" ||
    code === "ROSTER_HEADERS_MISSING" ||
    code === "ROSTER_SHEET_MISSING"
  ) {
    return NextResponse.json({ code }, { status: 400 });
  }
  if (code === "UNMAPPED_ACTIVE_USER" || code === "ROSTER_ADMIN_CONFLICT") {
    return NextResponse.json({ code }, { status: 409 });
  }

  throw error;
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentSessionUser();
    requireAdmin(sessionUser);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ code: "ROSTER_FILE_REQUIRED" }, { status: 400 });
    }

    validateRosterUploadMeta({ name: file.name, size: file.size });

    const summary = await importRosterUploadBuffer({
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ status: "ok", summary });
  } catch (error) {
    return errorResponse(error);
  }
}
