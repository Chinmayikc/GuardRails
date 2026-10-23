import { describe, expect, it } from "vitest";
import { publicAnalysisAction } from "@/lib/publicAnalysisAction";

describe("public analysis action", () => {
  const input = {
    extensionId: "mhutchie.git-graph",
    version: "1.30.0",
    fullAnalysisHref: "/extensions/mhutchie.git-graph/versions/1.30.0/scans/scan-1",
    scanned: true,
  };

  it("opens the full report publicly for a completed scan", () => {
    expect(publicAnalysisAction(input)).toEqual({
      href: input.fullAnalysisHref,
      label: "Open Full Analysis",
      requiresSignIn: false,
    });
  });

  it("keeps a public summary available if a completed scan has no report link", () => {
    expect(publicAnalysisAction({ ...input, fullAnalysisHref: undefined })).toEqual({
      href: "/extensions/mhutchie.git-graph/versions/1.30.0",
      label: "View Analysis Summary",
      requiresSignIn: false,
    });
  });

  it("still sends new scan requests through sign-in", () => {
    expect(publicAnalysisAction({ ...input, scanned: false })).toEqual({
      href: "/account?next=%2Fextensions%2Fmhutchie.git-graph%2Fversions%2F1.30.0",
      label: "Sign in to request a Deep Scan",
      requiresSignIn: true,
    });
  });
});
