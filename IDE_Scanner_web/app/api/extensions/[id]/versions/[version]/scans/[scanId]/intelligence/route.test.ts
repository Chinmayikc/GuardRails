import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extensions/[id]/versions/[version]/scans/[scanId]/intelligence/route";
import { getVersionScanProduct } from "@/lib/productData";

vi.mock("@/lib/productData", () => ({ getVersionScanProduct: vi.fn() }));

const mockedProduct = vi.mocked(getVersionScanProduct);

function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "x-real-ip": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
}

function validProduct() {
  return {
    version: "1.2.3",
    scan: { id: "scan-1", extension_id: "publisher.extension", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", decision: "review", coverage_percent: 100, capabilities: { network: true } },
    findings: [{ id: "finding-1", rule_id: "network-egress", summary: "Outbound request" }],
    files: [],
    dependencies: [],
  };
}

describe("deterministic evidence guide route", () => {
  it("returns an evidence-bound deterministic report without authentication", async () => {
    mockedProduct.mockResolvedValue(validProduct() as never);
    const response = await POST(request({ review_goal: "flag_investigation" }), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.identity).toMatchObject({ extension_id: "publisher.extension", version: "1.2.3", scan_id: "scan-1" });
    expect(body.validation).toMatchObject({ status: "deterministic_fallback", source: "deterministic" });
    expect(mockedProduct).toHaveBeenCalledWith("publisher.extension", "1.2.3", "scan-1", undefined, { compact: true, includePreviews: false, skipCloudflareCatalog: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects cross-origin requests before loading report data", async () => {
    const response = await POST(request({ review_goal: "install_decision" }, "https://attacker.example"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-2" }) });
    expect(response.status).toBe(403);
    expect(mockedProduct).not.toHaveBeenCalled();
  });

  it("rejects unsupported review goals and non-exact or incomplete artifacts", async () => {
    const params = { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-3" }) };
    expect((await POST(request({ review_goal: "generic_summary" }), params)).status).toBe(400);
    mockedProduct.mockResolvedValue({ scan: { id: "other", extension_id: "publisher.extension", version: "1.2.3" } } as never);
    expect((await POST(request({ review_goal: "install_decision" }), params)).status).toBe(404);
  });
});
