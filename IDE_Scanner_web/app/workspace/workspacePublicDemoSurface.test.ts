import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const teamsApi = readFileSync(new URL("../api/teams/route.ts", import.meta.url), "utf8");

describe("public workspace demo boundary", () => {
  it("shows a read-only sample workspace unless a session is verified", () => {
    expect(page).toContain('if (state === "ready") return <TeamWorkspace />');
    expect(page).toContain("return <PublicWorkspaceDemo />");
    expect(page).toContain("Public dashboard demo");
    expect(page).toContain("canExitSample={false}");
    expect(page).not.toContain("/account?next=/workspace");
    expect(page).toContain("@/app/workspace/sampleData");
  });

  it("keeps live team workspace APIs authenticated", () => {
    expect(teamsApi).toContain("authenticated(request)");
  });
});
