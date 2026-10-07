import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../src/features/admin/service";
import { getCurrentSessionUser } from "../../../../../src/features/auth/http-session";
import { getGoogleCalendarConnection } from "../../../../../src/features/google-calendar/repository";
import { DomainError } from "../../../../../src/lib/http";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    requireAdmin(user);

    const connection = await getGoogleCalendarConnection();
    return NextResponse.json({
      connected: Boolean(connection),
      accountEmail: connection?.googleAccountEmail ?? null,
      selectedCalendarId: connection?.selectedCalendarId ?? null,
      selectedCalendarName: connection?.selectedCalendarName ?? null,
      blockingCalendarIds: connection?.blockingCalendarIds ?? [],
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    throw error;
  }
}
