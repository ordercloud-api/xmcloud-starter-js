import { afterEach, describe, expect, it } from "vitest";
import { isValidEditingSecret } from "../lib/sitecore/authoring/editing-secret";

const originalSecret = process.env.SITECORE_EDITING_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SITECORE_EDITING_SECRET;
  else process.env.SITECORE_EDITING_SECRET = originalSecret;
});

describe("Sitecore editing secret", () => {
  it("accepts the secret used to render the editing canvas", () => {
    process.env.SITECORE_EDITING_SECRET = "editing-secret";

    expect(isValidEditingSecret("editing-secret")).toBe(true);
  });

  it("rejects missing or different secrets", () => {
    process.env.SITECORE_EDITING_SECRET = "editing-secret";

    expect(isValidEditingSecret(null)).toBe(false);
    expect(isValidEditingSecret("different-secret")).toBe(false);
  });
});
