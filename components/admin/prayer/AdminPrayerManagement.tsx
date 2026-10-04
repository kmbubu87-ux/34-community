"use client";

import { useMemo, useState } from "react";
import type { AdminDashboardData } from "../../../src/features/admin/service";
import { defaultEndDate } from "../../../src/features/challenge/date";
import { fetchJson } from "../../../src/lib/fetch-json";

function percent(value: number) {
  return Math.round(value * 100) + "%";
}

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

export function AdminPrayerManagement({ initial }: { initial: AdminDashboardData }) {
  const [data, setData] = useState(initial);
  const [showChallenge, setShowChallenge] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [participantQuery, setParticipantQuery] = useState("");
  const [samFilter, setSamFilter] = useState("");
  const [challengeStart, setChallengeStart] = useState(initial.challenge?.startDate ?? "");
  const [challengeEnd, setChallengeEnd] = useState(initial.challenge?.endDate ?? "");

  const filteredMembers = useMemo(() => {
    const needle = participantQuery.trim().toLocaleLowerCase("ko-KR");
    return data.members.filter((member) => {
      const matchesText =
        !needle ||
        member.name.toLocaleLowerCase("ko-KR").includes(needle) ||
        (member.position ?? "").toLocaleLowerCase("ko-KR").includes(needle);
      const matchesSam = !samFilter || (member.samLabel ?? "미지정") === samFilter;
      return matchesText && matchesSam;
    });
  }, [data.members, participantQuery, samFilter]);

  async function loadLatest() {
    const next = await jsonRequest<AdminDashboardData>("/api/admin/prayer", { cache: "no-store" });
    setData(next);
    setChallengeStart(next.challenge?.startDate ?? "");
    setChallengeEnd(next.challenge?.endDate ?? "");
  }

  async function refreshParticipants() {
    if (removingId || refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      await loadLatest();
    } catch {
      setError("최신 명단을 불러오지 못했습니다. 다시 새로고침해 주세요.");
    } finally {
      setRefreshing(false);
    }
  }

  async function removeParticipant(member: AdminDashboardData["members"][number]) {
    const challenge = data.challenge;
    if (!challenge?.isActive || removingId || refreshing) return;
    if (!window.confirm(
      `${member.name}님을 “${challenge.title}” (${challenge.startDate} ~ ${challenge.endDate}) 참여자 명단에서 삭제할까요?\n해당 도전의 명단과 통계에서만 제외됩니다. 로그인, 회원정보, 개인 기도 체크 기록은 유지됩니다.`,
    )) return;

    setRemovingId(member.userId);
    setError("");
    setMessage("");
    let removed = false;
    try {
      await jsonRequest(`/api/admin/prayer/participants/${member.userId}`, {
        method: "DELETE",
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      removed = true;
      setMessage(`${member.name}님을 “${challenge.title}” 명단에서 제외했습니다. 로그인과 개인 기록은 유지됩니다.`);
      await loadLatest();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(removed
        ? "제외 처리는 완료되었지만 최신 명단을 불러오지 못했습니다. 새로고침해 주세요."
        : code === "CHALLENGE_CHANGED"
          ? "활성 도전이 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요."
          : code === "NO_ACTIVE_CHALLENGE"
            ? "활성 도전이 없어 참여자를 제외할 수 없습니다."
            : code === "PARTICIPANT_NOT_FOUND"
              ? "참여자를 찾지 못했습니다. 새로고침한 뒤 다시 확인해 주세요."
              : "처리 결과를 확인하지 못했습니다. 새로고침해 명단을 확인해 주세요.");
    } finally {
      setRemovingId(null);
    }
  }

  function changeStart(value: string) {
    setChallengeStart(value);
    setChallengeEnd(value ? defaultEndDate(value) : "");
  }

  async function submitChallenge(formData: FormData) {
    setError("");
    try {
      await jsonRequest("/api/admin/challenge", {
        method: "POST",
        body: JSON.stringify({
          id: data.challenge?.id,
          title: String(formData.get("title") ?? ""),
          startDate: challengeStart,
          endDate: challengeEnd || undefined,
          isActive: formData.get("isActive") === "on",
        }),
      });
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "도전 설정을 저장하지 못했습니다.");
    }
  }

  return (
    <div className="admin-feature-page">
      <div className="section-heading">
        <section className="admin-page-heading">
          <p className="eyebrow">무제</p>
          <h1>무제 관리</h1>
          <p>
            {data.challenge
              ? data.challenge.startDate + " ~ " + data.challenge.endDate
              : "활성 도전 없음"}
          </p>
        </section>
        <button className="primary-button compact-button" type="button" disabled={Boolean(removingId) || refreshing} onClick={() => setShowChallenge(true)}>
          도전 설정
        </button>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}
      {message && <p className="success-text" role="status">{message}</p>}

      <section className="admin-kpis" aria-label="무제 현황">
        <article className="card"><span>전체 참여자</span><strong>{data.totals.members}명</strong></article>
        <article className="card"><span>오늘 완료</span><strong>{data.totals.todayCompleted}명 · {percent(data.totals.todayRate)}</strong></article>
        <article className="card"><span>평균 달성률</span><strong>{percent(data.totals.averageRate)}</strong></article>
      </section>

      <section className="card admin-section">
        <h2>달성률 구간</h2>
        <div className="bucket-grid">
          <div><strong>{data.buckets.perfect}</strong><span>100%</span></div>
          <div><strong>{data.buckets.high}</strong><span>80~99%</span></div>
          <div><strong>{data.buckets.medium}</strong><span>60~79%</span></div>
          <div><strong>{data.buckets.low}</strong><span>60% 미만</span></div>
        </div>
      </section>

      <section className="card admin-section">
        <h2>샘별 통계</h2>
        <div className="admin-table">
          <div className="admin-row admin-row-head">
            <span>샘</span><span>인원</span><span>평균</span><span>오늘</span>
          </div>
          {data.sams.map((sam) => (
            <div className="admin-row" key={sam.samLabel}>
              <span><strong>{sam.samLabel}</strong></span>
              <span>{sam.members}명</span>
              <span>{percent(sam.averageRate)}</span>
              <span>{sam.todayCompleted}명 · {percent(sam.todayRate)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card admin-section">
        <div className="section-heading">
          <h2>참여자 명단</h2>
          <div className="admin-filters">
            <button type="button" className="text-button" disabled={Boolean(removingId) || refreshing} onClick={() => void refreshParticipants()}>{refreshing ? "불러오는 중..." : "새로고침"}</button>
            <input
              value={participantQuery}
              onChange={(event) => setParticipantQuery(event.target.value)}
              placeholder="이름 또는 직분 검색"
              aria-label="참여자 검색"
            />
            <select value={samFilter} onChange={(event) => setSamFilter(event.target.value)} aria-label="샘 필터">
              <option value="">전체 샘</option>
              {data.sams.map((sam) => (
                <option key={sam.samLabel} value={sam.samLabel}>{sam.samLabel}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-table participant-table">
          <div className="admin-row admin-row-head participant-row">
            <span>이름</span><span>직분</span><span>전화번호</span><span>샘</span>
            <span>순위</span><span>달성률</span><span>오늘</span><span>관리</span>
          </div>
          {filteredMembers.map((member) => (
            <div className="admin-row participant-row" key={member.userId}>
              <span><strong>{member.name}</strong>{member.role === "admin" && <small>관리자</small>}</span>
              <span>{member.position ?? "미지정"}</span>
              <span>{member.phone ?? "미지정"}</span>
              <span>{member.samLabel ?? "미지정"}</span>
              <span>{member.rank}위</span>
              <span>{member.completed}/{member.eligible} · {percent(member.rate)}</span>
              <span>{member.completedToday ? "완료" : "미완료"}</span>
              <span><button className="text-button danger-button" type="button" disabled={!data.challenge?.isActive || Boolean(removingId) || refreshing} aria-label={`${member.name} 기도운동 명단에서 삭제`} onClick={() => void removeParticipant(member)}>{removingId === member.userId ? "처리 중..." : "삭제"}</button></span>
            </div>
          ))}
        </div>
      </section>

      {showChallenge && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowChallenge(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label="도전 설정" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowChallenge(false)} aria-label="닫기">×</button>
            <form action={submitChallenge} className="admin-form">
              <h2>도전 설정</h2>
              <label>제목<input name="title" defaultValue={data.challenge?.title ?? "무제"} required /></label>
              <label>시작일<input name="startDate" type="date" value={challengeStart} onChange={(event) => changeStart(event.target.value)} required /></label>
              <label>종료일<input name="endDate" type="date" value={challengeEnd} onChange={(event) => setChallengeEnd(event.target.value)} required /></label>
              <p className="helper-text">시작일을 바꾸면 1개월 기준 종료일이 자동 계산됩니다.</p>
              <label className="checkbox-row"><input name="isActive" type="checkbox" defaultChecked={data.challenge?.isActive ?? true} /> 활성화</label>
              <button className="primary-button" type="submit">저장</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
