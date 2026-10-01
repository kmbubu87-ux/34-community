import { redirect } from "next/navigation";
import { LoginForm } from "../../components/auth/LoginForm";
import { getCurrentSessionUser } from "../../src/features/auth/http-session";

export default async function LoginPage() {
  if (await getCurrentSessionUser()) redirect("/");
  return (
    <main className="shell auth-shell">
      <header className="hero-copy">
        <p className="eyebrow">34사랑</p>
        <h1>34공동체</h1>
        <p className="community-verse">성령이 하나 되게 하신 것을 힘써 지키라(엡 4:3)</p>
      </header>
      <LoginForm />
    </main>
  );
}
