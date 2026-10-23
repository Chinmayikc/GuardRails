import { NextResponse } from "next/server";
import { findings as sampleFindings } from "@/app/access-risk/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FINDINGS = 30;

export async function GET() {
  return NextResponse.json({ provider: "sample", findings: sampleFindings, sample: true });
}

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Send a valid JSON review request." }, { status: 400 }); }

  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { findings?: unknown }).findings)) {
    return NextResponse.json({ error: "A findings array is required." }, { status: 400 });
  }
  const rows = (payload as { findings: unknown[] }).findings;
  if (rows.length < 1 || rows.length > MAX_FINDINGS || rows.some((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return true;
    const finding = row as { id?: unknown; evidence?: unknown };
    return typeof finding.id !== "string" || finding.id.length > 80 || !Array.isArray(finding.evidence) || finding.evidence.length > 20 || finding.evidence.some((item) => typeof item !== "string" || item.length > 500);
  })) {
    return NextResponse.json({ error: `Provide between 1 and ${MAX_FINDINGS} valid findings.` }, { status: 400 });
  }

  const awsUrl = process.env.ACCESS_RISK_AWS_API_URL;
  if (awsUrl) {
    const sharedSecret = process.env.ACCESS_RISK_AWS_API_KEY;
    if (!sharedSecret) return NextResponse.json({ error: "AWS endpoint is configured without its server-side API key." }, { status: 503 });
    try {
      const upstream = await fetch(awsUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": sharedSecret },
        body: JSON.stringify({ action: "analyze", findings: rows }),
        cache: "no-store",
        signal: AbortSignal.timeout(28_000),
      });
      const data = await upstream.json();
      if (!upstream.ok) return NextResponse.json({ error: "AWS review service could not complete the analysis." }, { status: 502 });
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "AWS review service is unavailable. Sample findings remain available." }, { status: 502 });
    }
  }

  // Honest no-credentials path: the demo stays usable and explicitly reports sample mode.
  const now = new Date();
  return NextResponse.json({
    provider: "sample",
    sample: true,
    runId: `sample-${now.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
    findings: sampleFindings,
    explanation: "Sample mode uses the included fictional dataset. Configure the AWS API endpoint to store reviews in S3 and request a Bedrock explanation.",
  }, { headers: { "Cache-Control": "no-store" } });
}
