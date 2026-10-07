import { addDays } from "../challenge/date";
import type {
  CalendarProvider,
  VisitCalendarEventInput,
} from "../visits/calendar-provider";
import type { CalendarEventLike } from "../visits/types";

type CalendarResponse<T> = Promise<{ data: T }>;

export type CalendarClientLike = {
  events: {
    list(args: Record<string, unknown>, options?: { signal: AbortSignal; timeout: number; retry: boolean }): CalendarResponse<{
      items?: Array<{
        status?: string | null;
        start?: { date?: string | null; dateTime?: string | null } | null;
        end?: { date?: string | null; dateTime?: string | null } | null;
      }>;
      nextPageToken?: string | null;
    }>;
    insert(args: Record<string, unknown>): CalendarResponse<{ id?: string | null }>;
    update(args: Record<string, unknown>): CalendarResponse<unknown>;
    delete(args: Record<string, unknown>): CalendarResponse<unknown>;
  };
};

function summary(input: VisitCalendarEventInput): string {
  const label = input.samLabel?.trim() || "미지정";
  const samName = label.endsWith("샘") ? label : label + "샘";
  return `${samName} 심방${input.visitType === "sam" ? "(샘)" : ""}`;
}

function requestBody(input: VisitCalendarEventInput) {
  return {
    summary: summary(input),
    start: { date: input.visitDate },
    end: { date: addDays(input.visitDate, 1) },
    description: [
      "신청자: " + input.requesterName,
      "리더: " + (input.leaderName?.trim() || "미등록"),
      "장소: " + input.location,
      "희망 시간: " + input.preferredTime,
      "참석자 명단: " + input.attendees,
    ].join("\n"),
  };
}

export class GoogleCalendarProvider implements CalendarProvider {
  constructor(
    private readonly calendar: CalendarClientLike,
    private readonly calendarId: string,
    private readonly blockingCalendarIds: string[] = [],
  ) {}

  async listEvents(input: {
    timeMin: string;
    timeMax: string;
  }): Promise<CalendarEventLike[]> {
    const ids = [...new Set([this.calendarId, ...this.blockingCalendarIds])];
    const results = await Promise.all(ids.map(id => this.listCalendarEvents(id, input)));
    return results.flat();
  }

  private async listCalendarEvents(calendarId: string, input: { timeMin: string; timeMax: string }): Promise<CalendarEventLike[]> {
    const events: CalendarEventLike[] = [];
    const signal = AbortSignal.timeout(8_000);
    let pageToken: string | undefined;

    do {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        singleEvents: true,
        showDeleted: false,
        maxResults: 2500,
        fields: "items(status,start,end),nextPageToken",
        pageToken,
      }, { signal, timeout: 5_000, retry: false });

      for (const item of response.data.items ?? []) {
        events.push({
          status: item.status ?? null,
          start: item.start ?? null,
          end: item.end ?? null,
        });
      }
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  }

  async createVisitEvent(
    input: VisitCalendarEventInput,
  ): Promise<{ eventId: string }> {
    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: requestBody(input),
    });

    const eventId = response.data.id;
    if (!eventId) throw new Error("GOOGLE_EVENT_ID_MISSING");
    return { eventId };
  }

  async updateVisitEvent(
    eventId: string,
    input: VisitCalendarEventInput,
  ): Promise<void> {
    await this.calendar.events.update({
      calendarId: this.calendarId,
      eventId,
      requestBody: requestBody(input),
    });
  }

  async deleteVisitEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
    } catch (error) {
      // A previous delete may have succeeded before its response/DB write failed.
      // Only 410 means already deleted; 404 can also mean lost calendar access.
      if (error && typeof error === "object") {
        const failure = error as { response?: { status?: unknown }; code?: unknown };
        const status = failure.response?.status ?? failure.code;
        if (status === 410 || status === "410") return;
      }
      throw error;
    }
  }
}
