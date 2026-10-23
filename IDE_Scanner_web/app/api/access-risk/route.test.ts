import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("access risk demo API", () => {
  it("returns explicitly synthetic sample findings", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe("sample");
    expect(payload.sample).toBe(true);
    expect(payload.findings.length).toBeGreaterThan(0);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/access-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects empty or malformed findings", async () => {
    const response = await POST(new Request("http://localhost/api/access-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "analyze", findings: [{ id: "bad", evidence: null }] }),
    }));

    expect(response.status).toBe(400);
  });

  it("keeps the review flow usable while labelling its sample response", async () => {
    vi.stubEnv("ACCESS_RISK_AWS_API_URL", "");
    const response = await POST(new Request("http://localhost/api/access-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "analyze", findings: [{ id: "demo-1", evidence: ["synthetic evidence"] }] }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe("sample");
    expect(payload.sample).toBe(true);
    expect(payload.explanation).toContain("Sample mode");
  });

  it("fails closed when AWS is configured without its server key", async () => {
    vi.stubEnv("ACCESS_RISK_AWS_API_URL", "https://example.execute-api.us-east-1.amazonaws.com/v1/risk/run");
    vi.stubEnv("ACCESS_RISK_AWS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("http://localhost/api/access-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "analyze", findings: [{ id: "demo-1", evidence: ["synthetic evidence"] }] }),
    }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards configured reviews server-to-server and labels the AWS result", async () => {
    vi.stubEnv("ACCESS_RISK_AWS_API_URL", "https://example.execute-api.us-east-1.amazonaws.com/v1/risk/run");
    vi.stubEnv("ACCESS_RISK_AWS_API_KEY", "server-secret");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      provider: "aws", findings: [{ id: "demo-1", evidence: ["synthetic evidence"] }],
      explanation: "Check the evidence.", explanationSource: "rules", runId: "test-run",
    }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("http://localhost/api/access-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "analyze", findings: [{ id: "demo-1", evidence: ["synthetic evidence"] }] }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe("aws");
    expect(payload.explanationSource).toBe("rules");
    expect(fetchMock.mock.calls[0][1].headers["x-api-key"]).toBe("server-secret");
  });
});
