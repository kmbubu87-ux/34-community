"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "../auth/LogoutButton";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  displayName,
  children,
}: {
  displayName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-hub">
      <button
        className="admin-hub-menu-button"
        type="button"
        aria-label="관리자 메뉴 열기"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      {open && (
        <button
          className="admin-hub-overlay"
          type="button"
          aria-label="관리자 메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={open ? "admin-hub-sidebar is-open" : "admin-hub-sidebar"}>
        <div className="admin-hub-brand">
          <strong>34사랑 관리자</strong>
          <span>{displayName} 님</span>
        </div>
        <AdminSidebar onNavigate={() => setOpen(false)} />
        <div className="admin-hub-footer">
          <Link href="/">사용자 화면</Link>
          <LogoutButton />
        </div>
      </aside>

      <section className="admin-hub-stage">
        <header className="admin-hub-topbar">
          <div>
            <p className="eyebrow">34공동체</p>
            <strong>관리자 센터</strong>
          </div>
        </header>
        <div className="admin-hub-content">{children}</div>
      </section>
    </div>
  );
}
