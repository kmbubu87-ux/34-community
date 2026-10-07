import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "../../src/features/auth/http-session";
import { autumnEnabled } from "../../src/features/autumn/service";

export default async function Home() {
  if (!(await getCurrentSessionUser())) redirect("/login");
  redirect(await autumnEnabled() ? "/autumn" : "/community");
}
