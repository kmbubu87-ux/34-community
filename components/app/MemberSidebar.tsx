"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReportBadge } from "../pastoral/ReportStatusBadge";
import { UnreadNoticeBadge } from "../notices/UnreadNoticeBadge";

const memberNav = [
  { href: "/", label: "기도운동", icon: "🙏" },
  { href: "/visits", label: "심방신청", icon: "♡" },
  { href: "/prayer-requests", label: "기도요청", icon: "♥" },
  { href: "/community", label: "커뮤니티", icon: "💬" },
  { href: "/pastoral-reports", label: "목양지", icon: "📝" },
  { href: "/notices", label: "공지", icon: "🔔" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberSidebar({ onNavigate, unreadCount, pastoralVisible = false, pastoralCount = 0 }: { onNavigate?: () => void; unreadCount: number; pastoralVisible?: boolean; pastoralCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="member-nav" aria-label="34사랑 메뉴">
      {memberNav.filter(item => item.href !== "/pastoral-reports" || pastoralVisible).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={`member-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={onNavigate}>
            <span className="member-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.href === "/pastoral-reports" && <ReportBadge count={pastoralCount} />}
            {item.href === "/notices" && <UnreadNoticeBadge count={unreadCount} />}
          </Link>
        );
      })}
    </nav>
  );
}
