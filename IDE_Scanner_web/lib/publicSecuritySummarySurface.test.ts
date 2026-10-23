import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const summary = readFileSync(
  new URL("../app/PublicSecuritySummary.tsx", import.meta.url),
  "utf8",
);
const callout = readFileSync(
  new URL("../app/PublicAnalysisCallout.tsx", import.meta.url),
  "utf8",
);

describe("public security summary auth boundary", () => {
  it("keeps completed-report navigation independent of browser auth", () => {
    expect(summary).toContain("<PublicAnalysisCallout");
    expect(callout).not.toContain("/api/auth/session");
    expect(callout).not.toContain("Checking sign-in…");
    expect(callout).toContain("This completed report is public");
    expect(callout).toContain("publicAnalysisAction");
  });

  it("links to the full report publicly when the exact scan exists", () => {
    expect(summary).toContain("<PublicAnalysisCallout");
    expect(callout).toContain("publicAnalysisAction");
    expect(callout).toContain(
      '<Link className="button buttonDark" href={action.href}>',
    );
    expect(summary).toContain("scanned={scanned}");
  });

  it("uses the canonical Deep Scan control for an unscanned exact version", () => {
    expect(callout).toContain("<DeepScanButton");
    expect(callout).toContain("extensionId={extensionId}");
    expect(callout).toContain("version={version}");
  });
});
