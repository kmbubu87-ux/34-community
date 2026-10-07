"use client";

import { useEffect, useState } from "react";
import type { VisitDateAvailability } from "../../src/features/visits/types";
import { fetchJson } from "../../src/lib/fetch-json";

function currentSeoulMonth(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month;
}

function moveMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return (
    String(date.getUTCFullYear()).padStart(4, "0") +
    "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0")
  );
}

function dayNumber(date: string): number {
  return Number(date.slice(-2));
}

function weekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const unavailableLabel: Record<string, string> = {
  outside_booking_period: "신청 기간 밖",
  past_date: "지난 날짜",
  calendar_unavailable: "일정 확인 불가",
  google_event: "신청 불가",
  blocked_date: "신청 불가",
  blocked_weekday: "신청 불가 요일",
  existing_visit: "심방 신청 있음",
};

export function VisitCalendar({
  selectedDate,
  onSelect,
  refreshKey = 0,
}: {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  refreshKey?: number;
}) {
  const [month, setMonth] = useState(currentSeoulMonth);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<{
    key: string; dates: VisitDateAvailability[]; message: string;
  } | null>(null);
  const requestKey = `${month}:${refreshKey}:${retryKey}`;
  const loading = result?.key !== requestKey;
  const dates = !loading && result ? result.dates : [];
  const message = !loading && result ? result.message : "";

  useEffect(() => {
    const controller = new AbortController();

    void fetchJson<{ dates: VisitDateAvailability[] }>("/api/visits/availability?month=" + encodeURIComponent(month), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((body) => {
        if (!controller.signal.aborted) {
          const dates = Array.isArray(body.dates) ? body.dates : [];
          const unavailable = dates.some((date) => !date.available && date.reason === "calendar_unavailable");
          setResult({ key: requestKey, dates, message: unavailable
            ? "일정 조회가 지연되고 있습니다. 다시 확인해 주세요." : "" });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const code = error instanceof Error ? error.message : "";
        setResult({ key: requestKey, dates: [], message:
          code === "CALENDAR_NOT_CONNECTED" || code === "CALENDAR_NOT_SELECTED"
            ? "관리자가 Google Calendar를 연결하면 심방 신청을 시작할 수 있습니다."
            : "일정을 확인하기 어렵습니다. 잠시 후 다시 시도해 주세요.",
        });
      });

    return () => {
      controller.abort();
    };
  }, [month, requestKey]);

  function navigateMonth(amount: number) {
    setMonth((value) => moveMonth(value, amount));
  }

  const leadingCells = dates.length === 0 ? 0 : weekday(dates[0].date);

  return (
    <section className="card visit-calendar-card">
      <div className="visit-calendar-toolbar">
        <button
          type="button"
          className="text-button visit-month-button"
          onClick={() => navigateMonth(-1)}
          aria-label="이전 달"
        >
          ‹
        </button>
        <h3>{month.replace("-", "년 ")}월</h3>
        <button
          type="button"
          className="text-button visit-month-button"
          onClick={() => navigateMonth(1)}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="visit-weekdays" aria-hidden="true">
        {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {loading ? (
        <div className="visit-calendar-message">일정을 확인하고 있습니다.</div>
      ) : message ? (
        <div className="visit-calendar-message" role="status">
          <p>{message}</p>
          <button className="text-button" type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 확인</button>
        </div>
      ) : (
        <div className="visit-calendar-grid">
          {Array.from({ length: leadingCells }, (_, index) => (
            <span className="visit-day-spacer" key={"spacer-" + index} />
          ))}
          {dates.map((item) => {
            const selected = selectedDate === item.date;
            const reason = item.available ? null : unavailableLabel[item.reason];

            return (
              <button
                key={item.date}
                type="button"
                className={[
                  "visit-day",
                  item.available ? "is-available" : "is-unavailable",
                  selected ? "is-selected" : "",
                ].filter(Boolean).join(" ")}
                disabled={!item.available}
                onClick={() => onSelect(item.date)}
                aria-label={
                  item.available
                    ? item.date + " 심방 신청 가능"
                    : item.date + " " + (reason ?? "신청 불가")
                }
              >
                <span>{dayNumber(item.date)}</span>
                <small>{item.available ? "신청 가능" : reason}</small>
              </button>
            );
          })}
        </div>
      )}

      <div className="visit-calendar-legend">
        <span><i className="visit-dot is-free" /> 신청 가능</span>
        <span><i className="visit-dot is-busy" /> 신청 불가</span>
      </div>
    </section>
  );
}
