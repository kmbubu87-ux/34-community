import { redirect } from "next/navigation";
import { PrayerDashboardNoSsr } from "../../components/dashboard/PrayerDashboardNoSsr";
import { getCurrentSessionUser } from "../../src/features/auth/http-session";
import { getMemberDashboard } from "../../src/features/checkins/service";

export default async function Home() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const dashboard = await getMemberDashboard(user.id);
  if (!dashboard) {
    return (
      <main className="shell">
        <section className="card empty-state">
          <strong>무제</strong>
          <p className="helper-text">
            {user.displayName} 님, 메뉴에서 필요한 기능을 선택해 주세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <PrayerDashboardNoSsr initial={dashboard} />
    </main>
  );
}
  
