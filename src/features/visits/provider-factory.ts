import { DomainError } from "../../lib/http";
import {
  getAuthorizedGoogleCalendarContext,
} from "../google-calendar/client";
import {
  GoogleCalendarProvider,
  type CalendarClientLike,
} from "../google-calendar/provider";
import type { CalendarProvider } from "./calendar-provider";

export async function getSelectedCalendarProvider(): Promise<CalendarProvider> {
  const { connection, calendar } = await getAuthorizedGoogleCalendarContext();
  if (!connection.selectedCalendarId) {
    throw new DomainError("CALENDAR_NOT_SELECTED", 409);
  }

  return new GoogleCalendarProvider(
    calendar as unknown as CalendarClientLike,
    connection.selectedCalendarId,
    connection.blockingCalendarIds ?? [],
  );
}
