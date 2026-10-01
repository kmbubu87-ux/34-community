import Link from "next/link";
import type { AdminHubDashboardData } from "../../src/features/admin/hub-service";

function percent(value: number) {
  return Math.round(value * 100) + "%";
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminHubDashboard({
  data,
}: {
  data: AdminHubDashboardData;
}) {
  return (
    <div className="admin-hub-dashboard">
      <section className="admin-page-heading">
        <p className="eyebrow">전체 요약</p>
        <h1>대시보드</h1>
        <p>34사랑의 주요 현황을 한눈에 확인하세요.</p>
      </section>

      <section className="admin-summary-grid" aria-label="주요 현황">
        <Link className="admin-summary-card" href="/admin/prayer">
          <span>기도운동 참여</span>
          <strong>{data.prayer.participants}명</strong>
          <small>오늘 {data.prayer.todayCompleted}명 · {percent(data.prayer.todayRate)}</small>
        </Link>
        <Link className="admin-summary-card" href="/admin/visits?status=requested">
          <span>심방 신청 대기</span>
          <strong>{data.visits.requested}건</strong>
          <small>확인 후 유선으로 확정</small>
        </Link>
        <Link className="admin-summary-card" href="/admin/visits?status=confirmed">
          <span>이번 주 확정 심방</span>
          <strong>{data.visits.confirmedThisWeek}건</strong>
          <small>일정 관리로 이동</small>
        </Link>
        <Link className="admin-summary-card" href="/admin/prayer-requests?status=received">
          <span>미처리 기도요청</span>
          <strong>{data.prayerRequests.received}건</strong>
          <small>기도중 {data.prayerRequests.praying}건</small>
        </Link>
        <Link className="admin-summary-card" href="/admin/notices">
          <span>공지</span>
          <strong>{data.notices.published}건</strong>
          <small>{data.notices.latestTitle ?? "발행된 공지가 없습니다."}</small>
        </Link>
      </section>

      <section className="card admin-hub-activity">
        <div className="section-heading">
          <h2>최근 활동</h2>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="helper-text">아직 최근 활동이 없습니다.</p>
        ) : (
          <div className="admin-activity-list">
            {data.recentActivity.map((item) => (
              <Link
                key={item.kind + item.href + item.occurredAt}
                href={item.href}
                className="admin-activity-row"
              >
                <span>{item.label}</span>
                <small>{timeLabel(item.occurredAt)}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
