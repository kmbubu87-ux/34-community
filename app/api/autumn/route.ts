import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "../../../src/features/auth/http-session";
import { autumnEnabled, autumnState, recordAutumnPrayer, setAutumnEnabled } from "../../../src/features/autumn/service";
import { DomainError } from "../../../src/lib/http";

export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
  const user = await getCurrentSessionUser();
  if (!user) return response({ code: "UNAUTHORIZED" }, 401);
  try {
    if (new URL(request.url).searchParams.get("status") === "1") return response({ enabled: await autumnEnabled() });
    return response(await autumnState(user));
  } catch (error) {
    if (error instanceof DomainError) return response({ code: error.code }, error.status);
    throw error;
  }
}
export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  if (!user) return response({ code: "UNAUTHORIZED" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return response({ code: "FORBIDDEN" }, 403);
  const body = await request.json().catch(() => null);
  if (!body || !["pray", "visibility"].includes(body.action)) return response({ code: "INVALID_INPUT" }, 400);
  try {
    if (body.action === "visibility") {
      if (user.role !== "admin") return response({ code: "FORBIDDEN" }, 403);
      if (typeof body.enabled !== "boolean") return response({ code: "INVALID_INPUT" }, 400);
      await setAutumnEnabled(body.enabled);
    } else await recordAutumnPrayer(user.id);
    return response(await autumnState(user));
  } catch (error) {
    if (error instanceof DomainError) return response({ code: error.code }, error.status);
    throw error;
  }
}
