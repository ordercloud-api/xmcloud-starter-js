import { afterEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/editing/field/route";

const originalSecret = process.env.SITECORE_EDITING_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SITECORE_EDITING_SECRET;
  else process.env.SITECORE_EDITING_SECRET = originalSecret;
});

const request = (secret?: string) =>
  new Request("https://editing.example/api/editing/field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://editing.example",
      ...(secret ? { "X-Sitecore-Editing-Secret": secret } : {}),
    },
    body: "{}",
  });

describe("Sitecore editing field route", () => {
  it("rejects requests without the Pages editing secret", async () => {
    process.env.SITECORE_EDITING_SECRET = "editing-secret";

    expect((await POST(request())).status).toBe(403);
  });

  it("accepts the Pages secret before validating the field update", async () => {
    process.env.SITECORE_EDITING_SECRET = "editing-secret";

    expect((await POST(request("editing-secret"))).status).toBe(400);
  });
});
