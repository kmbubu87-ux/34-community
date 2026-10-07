import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRosterMember,
  deleteRosterMembers,
  listRosterForAdmin,
  updateRosterMember,
} from "../../../../src/features/admin/roster-service";
import { requireAdmin } from "../../../../src/features/admin/service";
import { getCurrentSessionUser } from "../../../../src/features/auth/http-session";
import { DomainError } from "../../../../src/lib/http";

const RosterInput = z.object({
  name: z.string().trim().min(1).max(120),
  position: z.string().trim().max(80).nullable(),
  phone: z.string().trim().max(30).nullable(),
  village: z.string().trim().max(80).nullable(),
  sam: z.string().trim().max(80).nullable(),
  isActive: z.boolean(),
  isAdmin: z.boolean(),
  officerRole: z.enum(["treasurer"]).nullable().optional(),
});

const RosterUpdate = RosterInput.extend({
  id: z.string().uuid(),
});

const RosterDelete = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

function errorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ code: error.code }, { status: error.status });
  }
  throw error;
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(await getCurrentSessionUser());
    const url = new URL(request.url);
    const participation = url.searchParams.get("participation");
    const safeParticipation =
      participation === "joined" || participation === "not_joined"
        ? participation
        : "all";
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);

    return NextResponse.json(
      await listRosterForAdmin({
        query: url.searchParams.get("q") ?? "",
        participation: safeParticipation,
        offset: Number.isFinite(offset) ? offset : 0,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin(await getCurrentSessionUser());
    const parsed = RosterInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    }
    const id = await createRosterMember(parsed.data);
    return NextResponse.json({ status: "ok", id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(await getCurrentSessionUser());
    const parsed = RosterUpdate.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    }
    const { id, ...input } = parsed.data;
    await updateRosterMember(id, input);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function DELETE(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    requireAdmin(user);
    const parsed = RosterDelete.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    }
    const deleted = await deleteRosterMembers(parsed.data.ids, user.id);
    return NextResponse.json({ status: "ok", deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
