import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), enabled: vi.fn(), state: vi.fn(), pray: vi.fn(), visibility: vi.fn() }));
vi.mock("../../src/features/auth/http-session", () => ({ getCurrentSessionUser: mocks.session }));
vi.mock("../../src/features/autumn/service", () => ({ autumnEnabled: mocks.enabled, autumnState: mocks.state, recordAutumnPrayer: mocks.pray, setAutumnEnabled: mocks.visibility }));
import { GET, POST } from "../../app/api/autumn/route";
import { DomainError } from "../../src/lib/http";
const request = (body: unknown, origin = "https://example.com") => new Request("https://example.com/api/autumn", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
describe("autumn security", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ id: "member", role: "member" }); mocks.state.mockResolvedValue({ enabled: true }); });
  it("does not expose entries or accept participation without login", async () => { mocks.session.mockResolvedValue(null); expect((await GET(new Request("https://example.com/api/autumn"))).status).toBe(401); expect((await POST(request({ action: "pray" }))).status).toBe(401); expect(mocks.state).not.toHaveBeenCalled(); expect(mocks.pray).not.toHaveBeenCalled(); });
  it("returns no private entries from navigation status", async () => { mocks.enabled.mockResolvedValue(true); const r = await GET(new Request("https://example.com/api/autumn?status=1")); expect(await r.json()).toEqual({ enabled: true }); expect(r.headers.get("cache-control")).toBe("private, no-store"); expect(mocks.state).not.toHaveBeenCalled(); });
  it("rejects cross-origin submissions", async () => { expect((await POST(request({ action: "pray" }, "https://evil.example"))).status).toBe(403); expect(mocks.pray).not.toHaveBeenCalled(); });
  it("cannot let members change visibility", async () => { expect((await POST(request({ action: "visibility", enabled: false }))).status).toBe(403); expect(mocks.visibility).not.toHaveBeenCalled(); });
  it("allows administrators to hide the campaign", async () => { mocks.session.mockResolvedValue({ id: "admin", role: "admin" }); expect((await POST(request({ action: "visibility", enabled: false }))).status).toBe(200); expect(mocks.visibility).toHaveBeenCalledWith(false); });
  it("records only the authenticated user's participation", async () => { await POST(request({ action: "pray", userId: "someone-else", prayerDate: "1900-01-01" })); expect(mocks.pray).toHaveBeenCalledWith("member"); });
  it("does not expose a closed campaign", async () => { mocks.state.mockRejectedValue(new DomainError("AUTUMN_CLOSED", 404)); expect((await GET(new Request("https://example.com/api/autumn"))).status).toBe(404); });
});
