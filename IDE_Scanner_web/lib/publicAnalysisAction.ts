type Input = {
  extensionId: string;
  version: string;
  fullAnalysisHref?: string;
  scanned: boolean;
};

export function publicAnalysisAction({ extensionId, version, fullAnalysisHref, scanned }: Input) {
  const versionHref = `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}`;
  const accountHref = `/account?next=${encodeURIComponent(versionHref)}`;

  if (scanned && fullAnalysisHref) {
    return { href: fullAnalysisHref, label: "Open Full Analysis", requiresSignIn: false };
  }

  return scanned
    ? { href: versionHref, label: "View Analysis Summary", requiresSignIn: false }
    : { href: accountHref, label: "Sign in to request a Deep Scan", requiresSignIn: true };
}
