import { NextResponse } from "next/server";
import { getVersionScanProduct } from "@/lib/productData";
import {
  compileEvidenceIntelligenceContext,
  buildDeterministicReviewFallback,
  verifyEvidenceIntelligenceTicket,
  type EvidenceIntelligenceContext,
  type EvidenceIntelligenceTicket,
  type IntelligenceReviewGoal,
  type IntelligenceDepth,
} from "@/lib/evidenceIntelligence";

export const dynamic = "force-dynamic";

// New clients send only the review options. Keep bounded headroom for a
// signed context ticket from an older cached client: the ticket contains
// serialized JSON inside JSON, so its escaped request bytes can exceed the
// original 36 KiB guard even though the server still caps the full body.
const MAX_BODY_BYTES = 128 * 1024;
const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS_PER_WINDOW = 3;
const localRequestBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; version: string; scanId: string }> },
) {
  const requestStartedAt = Date.now();
  const mark = (stage: string) => console.log("[evidence-intelligence-stage]", { stage, elapsed_ms: Date.now() - requestStartedAt });
  mark("start");
  const route = await context.params;
  const extensionId = decodeRoutePart(route.id);
  const version = decodeRoutePart(route.version);
  const scanId = decodeRoutePart(route.scanId);
  if (!isSafeIdentifier(extensionId, 220) || !isSafeIdentifier(version, 140) || !isSafeIdentifier(scanId, 140)) {
    return errorResponse("Invalid exact-release identity.", 400);
  }
  if (!sameOriginRequest(request)) return errorResponse("Cross-origin intelligence generation is not allowed.", 403);
  mark("request-validated");

  const length = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return errorResponse("Request body too large.", 413);

  const options = await readOptions(request);
  if (!options) return errorResponse("Unsupported intelligence review options.", 400);
  mark("options-read");

  const clientKey = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-client";
  const limit = checkRateLimit(clientKey);
  if (!limit.allowed) {
    return new NextResponse(JSON.stringify({ error: "Intelligence generation is temporarily rate limited.", code: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "Retry-After": String(limit.retryAfter) },
    });
  }
  mark("rate-limit-checked");
  let evidence: EvidenceIntelligenceContext | null = null;
  try {
    evidence = options.context_ticket ? verifyEvidenceIntelligenceTicket(options.context_ticket) : null;
    if (options.context_ticket && !evidence) return errorResponse("The exact report context could not be verified.", 409, "context_invalid");
    if (evidence) {
      if (evidence.identity.scan_id !== scanId || evidence.identity.extension_id.toLowerCase() !== extensionId.toLowerCase() || evidence.identity.version !== version || evidence.deterministic.analysis_status !== "complete" || !/^[a-f0-9]{64}$/i.test(evidence.identity.artifact_sha256)) {
        return errorResponse("A completed exact-artifact report is required.", 409);
      }
    } else {
      const product = await getVersionScanProduct(extensionId, version, scanId, undefined, { compact: true, includePreviews: false, skipCloudflareCatalog: true });
      const scan = product?.scan as Record<string, unknown> | null | undefined;
      if (!product || !scan || String(scan.id || "") !== scanId || String(scan.extension_id || "").toLowerCase() !== extensionId.toLowerCase() || String(scan.version || "") !== version) {
        return errorResponse("This exact report is not available.", 404);
      }
      if (String(scan.analysis_status || "") !== "complete" || !/^[a-f0-9]{64}$/i.test(String(scan.artifact_sha256 || ""))) {
        return errorResponse("A completed exact-artifact report is required.", 409);
      }
      evidence = compileEvidenceIntelligenceContext({ ...product, scan });
    }
    if (!evidence) return errorResponse("This exact report is not available.", 404);
    mark(evidence ? "evidence-ready" : "evidence-missing");
    const report = buildDeterministicReviewFallback(evidence, options.review_goal);
    mark("report-ready");
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      },
    });
  } catch (error) {
    mark("report-error");
    console.warn("[evidence-intelligence] report generation failed", { error: error instanceof Error ? error.name : "unknown" });
    return errorResponse("Evidence intelligence is temporarily unavailable.", 502, "report_unavailable");
  }
}

async function readOptions(request: Request): Promise<{ review_goal: IntelligenceReviewGoal; depth: IntelligenceDepth; context_ticket?: EvidenceIntelligenceTicket } | null> {
  const raw = await request.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  if (!raw.trim()) return { review_goal: "install_decision", depth: "standard" };
  try {
    const body = JSON.parse(raw) as { review_goal?: unknown; depth?: unknown; context_ticket?: unknown };
    const reviewGoal = body?.review_goal;
    const depth = body?.depth || "standard";
    if (reviewGoal !== "install_decision" && reviewGoal !== "flag_investigation" && reviewGoal !== "publisher_response") return null;
    if (depth !== "standard") return null;
    const contextTicket = body.context_ticket;
    if (contextTicket !== undefined && (!contextTicket || typeof contextTicket !== "object" || Array.isArray(contextTicket))) return null;
    return { review_goal: reviewGoal, depth, ...(contextTicket ? { context_ticket: contextTicket as EvidenceIntelligenceTicket } : {}) };
  } catch {
    return null;
  }
}

function checkRateLimit(clientKey: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const previous = localRequestBuckets.get(clientKey);
  if (!previous || previous.resetAt <= now) {
    localRequestBuckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (previous.count >= MAX_REQUESTS_PER_WINDOW) return { allowed: false, retryAfter: Math.ceil((previous.resetAt - now) / 1_000) };
  previous.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function decodeRoutePart(value: string): string {
  try { return decodeURIComponent(value); } catch { return ""; }
}

function isSafeIdentifier(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max && /^[A-Za-z0-9][A-Za-z0-9._+@-]*$/.test(value);
}

function sameOriginRequest(request: Request): boolean {
  const expected = new Set<string>();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try { expected.add(new URL(configured).origin); } catch { return false; }
  } else {
    try { expected.add(new URL(request.url).origin); } catch { return false; }
  }
  const origin = request.headers.get("origin")?.trim();
  if (origin) return expected.has(origin);
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return false;
  try { return expected.has(new URL(referer).origin); } catch { return false; }
}

function errorResponse(error: string, status: number, code?: string) {
  return NextResponse.json({ error, ...(code ? { code } : {}) }, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
