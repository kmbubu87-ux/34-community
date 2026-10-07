import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionUser } from "../../src/features/auth/session";
import { DomainError } from "../../src/lib/http";

vi.mock("server-only", () => ({}));
vi.mock("../../src/features/auth/http-session", () => ({ getCurrentSessionUser: vi.fn() }));
vi.mock("../../src/features/google-calendar/repository", () => ({
  getGoogleCalendarConnection: vi.fn(), deleteGoogleCalendarConnection: vi.fn(),
  saveGoogleCalendarConnection: vi.fn(), selectGoogleCalendar: vi.fn(),
}));
vi.mock("../../src/features/google-calendar/client", () => ({
  createGoogleOAuthClient: vi.fn(), listConnectedCalendars: vi.fn(),
}));

import { getCurrentSessionUser } from "../../src/features/auth/http-session";
import { getGoogleCalendarConnection, deleteGoogleCalendarConnection, selectGoogleCalendar } from "../../src/features/google-calendar/repository";
import { createGoogleOAuthClient, listConnectedCalendars } from "../../src/features/google-calendar/client";
import { GET as connect } from "../../app/api/admin/google-calendar/connect/route";
import { GET as status } from "../../app/api/admin/google-calendar/status/route";
import { DELETE as disconnect } from "../../app/api/admin/google-calendar/connection/route";
import { GET as callback } from "../../app/api/admin/google-calendar/callback/route";
import { GET as calendars } from "../../app/api/admin/google-calendar/calendars/route";
import { PUT as selection } from "../../app/api/admin/google-calendar/selection/route";

const request = () => new NextRequest("https://example.test/api/admin/google-calendar/connect");
const handlers = [
  ["connect", () => connect(request())], ["status", status], ["disconnect", disconnect],
  ["callback", () => callback(request())], ["calendars", calendars],
  ["selection", () => selection(request())],
] as const;

beforeEach(() => vi.resetAllMocks());

describe.each([null, { id: "member", role: "member" } as SessionUser])("Calendar authorization for %j", (user) => {
  it.each(handlers)("%s returns the established JSON 403 before any Calendar access", async (_name, handler) => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(user);
    const response = await handler();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "FORBIDDEN" });
    expect(getGoogleCalendarConnection).not.toHaveBeenCalled();
    expect(createGoogleOAuthClient).not.toHaveBeenCalled();
    expect(deleteGoogleCalendarConnection).not.toHaveBeenCalled();
  });
});

describe("Calendar administrator error handling", () => {
  beforeEach(() => vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "admin", role: "admin" } as SessionUser));

  it("connect reports missing configuration as 503", async () => {
    vi.mocked(createGoogleOAuthClient).mockImplementation(() => { throw new Error("MISSING_GOOGLE_CALENDAR_CONFIG"); });
    const response = await connect(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "GOOGLE_CALENDAR_NOT_CONFIGURED" });
  });

  it.each([["status", status], ["disconnect", disconnect]] as const)("%s preserves DomainError status", async (_name, handler) => {
    vi.mocked(getGoogleCalendarConnection).mockRejectedValue(new DomainError("CALENDAR_UNAVAILABLE", 503));
    const response = await handler();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "CALENDAR_UNAVAILABLE" });
  });

  it("does not report a failed local disconnect as success", async () => {
    vi.mocked(getGoogleCalendarConnection).mockResolvedValue(null);
    vi.mocked(deleteGoogleCalendarConnection).mockRejectedValue(new Error("database unavailable"));
    await expect(disconnect()).rejects.toThrow("database unavailable");
  });

  it("returns only safe disconnected status fields", async () => {
    vi.mocked(getGoogleCalendarConnection).mockResolvedValue(null);
    expect(await (await status()).json()).toEqual({ connected: false, accountEmail: null, selectedCalendarId: null, selectedCalendarName: null, blockingCalendarIds: [] });
  });
  it("accepts a read-only shared blocker while preserving the writable visit calendar", async () => {
    vi.mocked(listConnectedCalendars).mockResolvedValue([{id:"visits",summary:"Visits",primary:false,accessRole:"owner"},{id:"church",summary:"Church",primary:false,accessRole:"reader"}]);
    const response=await selection(new Request("https://example.test",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({calendarId:"visits",blockingCalendarIds:["church"]})}));
    expect(response.status).toBe(200);
    expect(selectGoogleCalendar).toHaveBeenCalledWith("visits","Visits",["church"]);
  });
  it("rejects an inaccessible additional calendar without saving", async () => {
    vi.mocked(listConnectedCalendars).mockResolvedValue([{id:"visits",summary:"Visits",primary:false,accessRole:"owner"}]);
    const response=await selection(new Request("https://example.test",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({calendarId:"visits",blockingCalendarIds:["unknown"]})}));
    expect(response.status).toBe(409);
    expect(selectGoogleCalendar).not.toHaveBeenCalled();
  });
});
