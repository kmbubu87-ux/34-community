"use client";
import { useEffect, useState } from "react";
import type { AutumnEntry } from "../../src/features/autumn/service";
import "./autumn.css";

type State = { enabled: boolean; entries: AutumnEntry[]; today: string; prayed: boolean; total: number; admin: boolean };
export function AutumnCampaign() {
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [village, setVillage] = useState(""), [sam, setSam] = useState(""), [search, setSearch] = useState("");
  async function load() {
    setError("");
    try { const r = await fetch("/api/autumn", { cache: "no-store" }); if (!r.ok) throw new Error(r.status === 404 ? "가을빛 축제 운영 기간이 아닙니다." : "명단을 불러오지 못했습니다. 다시 시도해 주세요."); setData(await r.json()); } catch (e) { setError(e instanceof Error ? e.message : "연결을 확인해 주세요."); }
  }
  useEffect(() => { void load(); }, []);
  async function action(body: object) {
    if (busy) return;
    setBusy(true); setError("");
    try { const r = await fetch("/api/autumn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) { if (r.status === 404) setData(null); throw new Error(r.status === 404 ? "가을빛 축제 운영이 종료됐습니다." : "저장하지 못했습니다. 다시 시도해 주세요."); } setData(await r.json()); } catch (e) { setError(e instanceof Error ? e.message : "연결을 확인해 주세요."); } finally { setBusy(false); }
  }
  const entries = data?.entries ?? [];
  const sams = [...new Set(entries.filter(e => !village || e.sam.startsWith(village + "-")).map(e => e.sam))];
  const query = search.replace(/\s/gu, "").toLowerCase();
  const visible = entries.filter(e => (!village || e.sam.startsWith(village + "-")) && (!sam || e.sam === sam) && `${e.sam} ${e.pledger} ${e.target}`.replace(/\s/gu, "").toLowerCase().includes(query));
  return <main className="autumn">
    <section className="autumn-hero"><svg viewBox="0 0 320 260" fill="none" aria-hidden="true"><path d="M55 240C130 140 191 78 290 25" stroke="#bd895c" strokeWidth="2"/><path d="M148 126C93 134 79 79 73 50C122 43 170 70 148 126Z" fill="#bd6d38"/><path d="M178 99C193 48 248 48 276 51C261 96 222 124 178 99Z" fill="#d8a367"/><path d="M99 182C49 188 24 149 13 113C64 106 119 128 99 182Z" fill="#d8a367"/><path d="M135 152C176 117 219 140 241 166C203 190 156 193 135 152Z" fill="#98543c"/></svg><div className="autumn-copy"><p className="autumn-eyebrow">2026 · 34공동체</p><h2>가을빛 축제<br/>함께 기도하는 초대</h2><p>마음에 품은 한 사람을 위해<br/>34공동체가 함께 기도합니다.</p></div><div className="autumn-hero-foot">태신자 작정 명단과 기도제목</div></section>
    {error && <div role="alert" className="autumn-error">{error} <button onClick={() => void load()} disabled={busy}>다시 불러오기</button></div>}
    {!data && !error && <p role="status">명단을 불러오는 중입니다…</p>}
    {data && <>
      {data.admin && <section className="autumn-admin"><span>{data.enabled ? "가을빛 탭 공개 중" : "가을빛 탭 숨김 · 관리자 미리보기"}</span><button disabled={busy} onClick={() => { if (data.enabled && !window.confirm("가을빛 탭을 숨기고 기도 참여를 종료할까요? 기록은 보관됩니다.")) return; void action({ action: "visibility", enabled: !data.enabled }); }}>{data.enabled ? "탭 숨기기" : "탭 열기"}</button></section>}
      <p className="autumn-intro">가을빛 축제에 초대하고 싶은 분들을 함께 마음에 품어 주세요.<br/>각 샘의 기도제목을 읽고, 한 사람 한 사람을 위해 기도해 주세요.</p>
      <section className="autumn-participation"><div><strong>{data.today.slice(5).replace("-", "/")} 함께 드리는 기도</strong><p>오늘 함께 기도한 공동체 {data.total}명</p></div><button className={data.prayed ? "done" : ""} disabled={busy || data.prayed || !data.enabled} onClick={() => void action({ action: "pray" })}>{data.prayed ? "오늘 기도했어요 ✓" : busy ? "저장 중…" : "오늘 함께 기도했어요"}</button></section>
      <section className="autumn-stats"><div><strong>{entries.length}</strong><span>기도 작정 건</span></div><div><strong>{new Set(entries.map(e => e.pledger)).size}</strong><span>작정자</span></div><div><strong>{new Set(entries.map(e => e.sam)).size}</strong><span>참여 샘</span></div></section>
      <nav className="autumn-tabs" aria-label="마을 선택">{["", "1", "2", "3", "4", "5"].map(v => <button key={v} aria-pressed={village === v} className={village === v ? "active" : ""} onClick={() => { setVillage(v); setSam(""); }}>{v ? v + "마을" : "전체"}</button>)}</nav>
      <div className="autumn-filters"><select aria-label="샘 선택" value={sam} onChange={e => setSam(e.target.value)}><option value="">모든 샘</option>{sams.map(s => <option key={s} value={s}>{s}샘</option>)}</select><input type="search" aria-label="이름 또는 샘 검색" placeholder="이름 또는 샘을 찾아보세요" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <p className="autumn-count">{village ? village + "마을" : "전체"} · {visible.length}건의 기도제목</p>
      <section className="autumn-cards">{visible.map((e, i) => <article className="autumn-card" key={`${e.sam}:${e.pledger}:${e.target}:${i}`}><div className="autumn-card-top"><span className="autumn-sam">{e.sam}샘</span><span>{e.relationship}</span></div><h3>{e.target}</h3><p className="autumn-pledger">작정자 {e.pledger}</p><div className="autumn-prayer"><span>함께 드리는 기도</span><p>{e.prayer}</p></div></article>)}</section>
      {!visible.length && <p className="autumn-empty">조건에 맞는 기도제목이 없습니다.</p>}
      <p className="autumn-source">2026년 10월 7일 원본 확인 기준 · 34공동체 태신자 작정 명단<br/>동일 이름도 원본의 작정 건별로 유지했습니다.</p>
    </>}
  </main>;
}
