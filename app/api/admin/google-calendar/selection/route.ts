import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../../src/features/admin/service";
import { getCurrentSessionUser } from "../../../../../src/features/auth/http-session";
import { listConnectedCalendars } from "../../../../../src/features/google-calendar/client";
import { selectGoogleCalendar } from "../../../../../src/features/google-calendar/repository";
import { DomainError } from "../../../../../src/lib/http";

const Selection = z.object({
  calendarId: z.string().min(1).max(1024),
  blockingCalendarIds: z.array(z.string().min(1).max(1024)).max(20).optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    requireAdmin(user);

    const parsed = Selection.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    }

    const calendars = await listConnectedCalendars();
    const selected = calendars.find(
      (calendar) => calendar.id === parsed.data.calendarId,
    );
    if (!selected) {
      return NextResponse.json(
        { code: "GOOGLE_CALENDAR_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!["owner", "writer"].includes(selected.accessRole ?? "")) {
      return NextResponse.json(
        { code: "GOOGLE_CALENDAR_NOT_WRITABLE" },
        { status: 409 },
      );
    }

    if (parsed.data.blockingCalendarIds?.some(id => !calendars.some(c => c.id === id && ["owner", "writer", "reader"].includes(c.accessRole ?? "")))) {
      return NextResponse.json({ code: "GOOGLE_BLOCKING_CALENDAR_NOT_READABLE" }, { status: 409 });
    }
    await selectGoogleCalendar(selected.id, selected.summary, parsed.data.blockingCalendarIds);
    return NextResponse.json({
      status: "ok",
      calendar: {
        id: selected.id,
        name: selected.summary,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ code: error.code }, { status: error.status });
    }
    throw error;
  }
}
