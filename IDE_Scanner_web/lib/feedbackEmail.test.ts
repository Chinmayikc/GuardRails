import { afterEach, describe, expect, it } from "vitest";
import { feedbackEmailConfigured, feedbackEmailPayload } from "@/lib/feedbackEmail";

const names = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "NOTIFICATION_FROM_EMAIL", "FEEDBACK_TO_EMAIL"] as const;
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = original[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("feedback email delivery", () => {
  it("does not guess a sender or recipient when mail settings are absent", () => {
    for (const name of names) delete process.env[name];
    expect(feedbackEmailConfigured()).toBe(false);
  });

  it("sends only to explicitly configured addresses", () => {
    process.env.RESEND_API_KEY = "resend_test";
    process.env.RESEND_FROM_EMAIL = "feedback@example.test";
    process.env.FEEDBACK_TO_EMAIL = "inbox@example.test";

    expect(feedbackEmailConfigured()).toBe(true);
    expect(feedbackEmailPayload({
      id: "feedback-1",
      category: "report_clarity",
      message: "The evidence summary was useful.",
      contactEmail: "person@example.test",
      pagePath: "/extensions/example",
      createdAt: "2026-08-30T12:00:00.000Z",
    })).toMatchObject({
      from: "feedback@example.test",
      to: ["inbox@example.test"],
      subject: "[GuardRails feedback] Report clarity",
      text: expect.stringContaining("The evidence summary was useful."),
    });
  });
});
