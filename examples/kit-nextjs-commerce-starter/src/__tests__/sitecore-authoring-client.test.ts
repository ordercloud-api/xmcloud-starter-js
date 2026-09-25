import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetAuthoringTokenCacheForTests,
  updateAuthoringField,
} from "../lib/sitecore/authoring/client";

const originalEnv = {
  host: process.env.SITECORE_AUTHORING_HOST,
  clientId: process.env.SITECORE_AUTHORING_CLIENT_ID,
  clientSecret: process.env.SITECORE_AUTHORING_CLIENT_SECRET,
};

const restore = (name: string, value: string | undefined) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

afterEach(() => {
  restore("SITECORE_AUTHORING_HOST", originalEnv.host);
  restore("SITECORE_AUTHORING_CLIENT_ID", originalEnv.clientId);
  restore("SITECORE_AUTHORING_CLIENT_SECRET", originalEnv.clientSecret);
  resetAuthoringTokenCacheForTests();
});

describe("Sitecore authoring client", () => {
  it("updates only the requested field and datasource", async () => {
    process.env.SITECORE_AUTHORING_HOST = "https://authoring.example";
    process.env.SITECORE_AUTHORING_CLIENT_ID = "client-id";
    process.env.SITECORE_AUTHORING_CLIENT_SECRET = "client-secret";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "access-token", expires_in: 900 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { updateItem: { item: { itemId: "datasource-id" } } },
          }),
          { status: 200 },
        ),
      );

    await updateAuthoringField(
      {
        dataSource: "{11111111-1111-1111-1111-111111111111}",
        fieldName: "Products",
        language: "en",
        value: "SKU-1\nSKU-2",
      },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    const [, request] = fetcher.mock.calls[1];
    const payload = JSON.parse(String(request?.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(payload.variables.input).toMatchObject({
      database: "master",
      itemId: "{11111111-1111-1111-1111-111111111111}",
      language: "en",
      fields: [{ name: "Products", value: "SKU-1\nSKU-2", reset: false }],
    });
  });

  it("requires dedicated server-side authoring credentials", async () => {
    delete process.env.SITECORE_AUTHORING_HOST;
    delete process.env.SITECORE_AUTHORING_CLIENT_ID;
    delete process.env.SITECORE_AUTHORING_CLIENT_SECRET;

    await expect(
      updateAuthoringField(
        {
          dataSource: "datasource",
          fieldName: "Product ID",
          language: "en",
          value: "SKU-1",
        },
        vi.fn<typeof fetch>(),
      ),
    ).rejects.toThrow("Sitecore authoring is not configured");
  });
});
