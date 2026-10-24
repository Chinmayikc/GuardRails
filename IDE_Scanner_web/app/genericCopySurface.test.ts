import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const auditedSurfaces = [
  "./about/page.tsx",
  "./PublicSecuritySummary.tsx",
  "./EvidenceIntelligenceReport.tsx",
  "./dossier/OverviewSection.tsx",
  "./ide/page.tsx",
  "./solutions/ai-agent-security/page.tsx",
  "./design-system/page.tsx",
  "./solutions/SolutionPage.tsx",
  "./solutions/data.ts",
  "./workspace/page.tsx",
  "./workspace/views/WorkspaceOnboarding.tsx",
  "./workspace/views/SettingsView.tsx",
  "./workspace/views/ActivityView.tsx",
  "./workspace/views/WorkspaceSetup.tsx",
  "./workspace/NotificationCenter.tsx",
  "./workspace/NotificationSettings.tsx",
  "./publishers/[publisher]/page.tsx",
  "./home/ReleaseReviewFilm.tsx",
  "./monitor/page.tsx",
  "./integrations/page.tsx",
  "./pricing/page.tsx",
  "./research/page.tsx",
  "./reports/page.tsx",
  "./security/page.tsx",
  "./TeamWorkspace.tsx",
] as const;

describe("site copy audit", () => {
  it("keeps audited surfaces out of the retired generic-AI language", () => {
    const source = auditedSurfaces.map(read).join("\n");
    for (const phrase of [
      "Make security findings easier to understand.",
      "Built for the role",
      "Less noise. More decision context.",
      "Every extension decision in one trusted place.",
      "What this means here",
      "What this means",
      "WHY NOW",
      "Start with a name. Next, GuardRails will help you monitor",
      "Clear responsibility at every level",
      "Start with real protection.",
      "Build your security workspace.",
      "A living security record.",
      "One useful reason to come back.",
      "Not another generic activity feed",
      "Explore the publisher’s catalog.",
      "What changed, in one place.",
      "<small>Get started</small>",
      "Security brief",
      "Generate again",
      "Explore explicit,",
    ]) {
      expect(source).not.toContain(phrase);
    }
  });

  it("keeps the role pages tied to release evidence and a concrete workflow", () => {
    const solution = read("./solutions/SolutionPage.tsx");
    expect(solution).toContain("Evidence for this role");
    expect(solution).toContain("The release question stays visible.");
    expect(solution).toContain("Open the workflow");
    expect(read("./solutions/data.ts")).toContain("Model requests for files");
  });
});
