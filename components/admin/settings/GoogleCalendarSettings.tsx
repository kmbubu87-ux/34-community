"use client";

import { useEffect, useState } from "react";

type CalendarStatus = {
  connected: boolean;
  accountEmail: string | null;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  blockingCalendarIds?: string[];
};

type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
};

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.code ?? "GOOGLE_CALENDAR_REQUEST_FAILED");
  return body;
}

export function GoogleCalendarSettings({
  configured,
}: {
  configured: boolean;
}) {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selection, setSelection] = useState("");
  const [blocking, setBlocking] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!configured) return;
    try {
      const body = await readJson("/api/admin/google-calendar/status");
      const next = body as CalendarStatus;
      setStatus(next);
      setSelection(next.selectedCalendarId ?? "");
      setBlocking(next.blockingCalendarIds ?? []);

      if (next.connected) {
        const list = await readJson("/api/admin/google-calendar/calendars");
        setCalendars((list.calendars ?? []) as CalendarOption[]);
      } else {
        setCalendars([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google Calendar 상태를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    void readJson("/api/admin/google-calendar/status")
      .then(async (body) => {
        if (cancelled) return;
        const next = body as CalendarStatus;
        setStatus(next);
        setSelection(next.selectedCalendarId ?? "");
      setBlocking(next.blockingCalendarIds ?? []);

        if (next.connected) {
          const list = await readJson("/api/admin/google-calendar/calendars");
          if (!cancelled) {
            setCalendars((list.calendars ?? []) as CalendarOption[]);
          }
        } else {
          setCalendars([]);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Google Calendar 상태를 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function saveSelection() {
    if (!selection || busy) return;
    setBusy(true);
    setError("");
    try {
      await readJson("/api/admin/google-calendar/selection", {
        method: "PUT",
        body: JSON.stringify({ calendarId: selection, blockingCalendarIds: blocking }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "캘린더를 선택하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy || !window.confirm("Google Calendar 연결을 해제할까요?")) return;
    setBusy(true);
    setError("");
    try {
      await readJson("/api/admin/google-calendar/connection", {
        method: "DELETE",
      });
      setStatus({
        connected: false,
        accountEmail: null,
        selectedCalendarId: null,
        selectedCalendarName: null,
      });
      setCalendars([]);
      setSelection("");
      setBlocking([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "연결을 해제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card admin-setting-card">
      <div className="section-heading">
        <div>
          <h2>Google Calendar</h2>
          <p className="helper-text">
            심방 신청 가능 날짜 확인과 일정 생성을 위한 운영 캘린더를 연결합니다.
          </p>
        </div>
      </div>

      {!configured ? (
        <div className="setting-warning">
          <strong>Google Calendar 연동 환경설정이 필요합니다.</strong>
          <p className="helper-text">서버 설정을 완료한 뒤 연결할 수 있습니다.</p>
        </div>
      ) : status === null ? (
        <p className="helper-text">Google Calendar 상태를 확인하는 중입니다.</p>
      ) : !status.connected ? (
        <div className="setting-actions">
          <a
            className="primary-button compact-button admin-link-button"
            href="/api/admin/google-calendar/connect"
          >
            Google Calendar 연결
          </a>
        </div>
      ) : (
        <div className="admin-setting-stack">
          <dl className="setting-summary">
            <div>
              <dt>연결 상태</dt>
              <dd>연결됨</dd>
            </div>
            {status.accountEmail && (
              <div>
                <dt>계정</dt>
                <dd>{status.accountEmail}</dd>
              </div>
            )}
            <div>
              <dt>운영 캘린더</dt>
              <dd>{status.selectedCalendarName ?? "선택 필요"}</dd>
            </div>
          </dl>

          <label className="setting-field">
            캘린더 선택
            <select
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              disabled={busy}
            >
              <option value="">캘린더를 선택하세요</option>
              {calendars
                .filter((calendar) =>
                  calendar.accessRole === "owner" || calendar.accessRole === "writer",
                )
                .map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}{calendar.primary ? " (기본)" : ""}
                  </option>
                ))}
            </select>
          </label>

          <fieldset disabled={busy}>
            <legend>심방 신청 차단용 추가 캘린더</legend>
            <p className="helper-text">선택한 캘린더에 일정이 있는 날짜는 심방 신청이 닫힙니다. 일정 제목·내용은 신청자에게 공개하지 않습니다.</p>
            {calendars.filter(c => c.id !== selection && ["owner", "writer", "reader"].includes(c.accessRole ?? "")).map(c => (
              <label className="checkbox-row" key={c.id}><input type="checkbox" checked={blocking.includes(c.id)} onChange={e => setBlocking(current => e.target.checked ? [...current, c.id] : current.filter(id => id !== c.id))} />{c.summary}</label>
            ))}
          </fieldset>
          <div className="setting-actions">
            <button
              className="primary-button compact-button"
              type="button"
              disabled={busy || !selection || (selection === status.selectedCalendarId && JSON.stringify([...blocking].sort()) === JSON.stringify([...(status.blockingCalendarIds ?? [])].sort()))}
              onClick={() => void saveSelection()}
            >
              캘린더 저장
            </button>
            <button
              className="text-button danger-button"
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
            >
              연결 해제
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}
