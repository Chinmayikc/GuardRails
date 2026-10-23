import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("public account route", () => {
  it("redirects legacy account links to the public workspace demo", () => {
    const page = read("app/account/page.tsx");
    expect(page).toContain('redirect("/workspace")');
    expect(page).not.toContain("Email me a secure link");
    expect(page).not.toContain("Continue with Google");
    expect(page).not.toContain("Continue with GitHub");
  });

  it("does not send signed-out visitors to the sign-in screen", () => {
    const header = read("app/HeaderAccount.tsx");
    expect(header).toContain('href="/workspace"');
    expect(header).toContain("Workspace demo");
    expect(header).not.toContain('href="/account"');
  });
});
