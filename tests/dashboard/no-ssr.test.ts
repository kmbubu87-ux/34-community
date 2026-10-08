import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard browser-only boundary", () => {
  it("disables server prerendering for the interactive prayer dashboard", () => {
    const wrapper = readFileSync(
      "components/dashboard/PrayerDashboardNoSsr.tsx",
      "utf8",
    );
    const page = readFileSync("app/(member)/challenge/page.tsx", "utf8");

    expect(wrapper).toContain('"use client"');
    expect(wrapper).toMatch(/ssr:\s*false/);
    expect(page).toContain("PrayerDashboardNoSsr");
    expect(page).not.toContain("<PrayerDashboardClient");
  });
});
