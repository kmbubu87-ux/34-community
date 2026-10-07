"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionUser } from "../../src/features/auth/session";
import { LogoutButton } from "../auth/LogoutButton";
import { ReportBadge, usePastoralBadge } from "../pastoral/ReportStatusBadge";
import { MemberSidebar } from "./MemberSidebar";
import { UnreadNoticeBadge, useUnreadNoticeCount } from "../notices/UnreadNoticeBadge";

export function MemberShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useUnreadNoticeCount();
  const pastoral = usePastoralBadge();
  const [autumnVisible, setAutumnVisible] = useState(false);
  useEffect(() => { let current = true; void fetch("/api/autumn?status=1", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (current) setAutumnVisible(data?.enabled === true); }).catch(() => undefined); return () => { current = false; }; }, []);

  return (
    <div className="community-app">
      <aside className={`community-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/icons/34-heart-192.png" alt="" width={44} height={44} />
          <strong>34사랑</strong>
        </div>

        <MemberSidebar autumnVisible={autumnVisible} pastoralVisible={pastoral.visible} pastoralCount={pastoral.count} unreadCount={unreadCount} onNavigate={() => setMenuOpen(false)} />

        <div className="sidebar-footer">
          <Link href="/profile" onClick={() => setMenuOpen(false)}>내 정보</Link>
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>관리자</Link>
          )}
          <LogoutButton />
        </div>
      </aside>

      {menuOpen && (
        <button
          className="community-drawer-overlay"
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="community-main">
        <header className="community-header">
          <button
            className="community-menu-button"
            type="button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ☰
            {pastoral.count > 0 ? <ReportBadge count={pastoral.count} /> : <UnreadNoticeBadge count={unreadCount} />}
          </button>
          <div>
            <h1>34공동체</h1>
            <p className="community-verse">성령이 하나 되게 하신 것을 힘써 지키라(엡 4:3)</p>
          </div>
        </header>
        <div className="community-content">{children}</div>
      </div>
    </div>
  );
}
