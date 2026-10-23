import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountPage = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");

describe("public account route", () => {
  it("redirects to the public demo instead of exposing a login form", () => {
    expect(accountPage).toContain('redirect("/workspace")');
    expect(accountPage).not.toContain("sendEmailLink");
    expect(accountPage).not.toContain("/api/auth/email/request");
    expect(accountPage).not.toContain('oauth("github")');
    expect(accountPage).not.toContain('oauth("google")');
  });
});
