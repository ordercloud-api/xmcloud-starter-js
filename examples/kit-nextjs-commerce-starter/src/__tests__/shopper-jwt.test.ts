import { describe, expect, it } from "vitest";
import { readOrderCloudClientId } from "../lib/commerce/auth/shopper-jwt";

const encodeSegment = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createToken = (payload: object): string =>
  `${encodeSegment({ alg: "none", typ: "JWT" })}.${encodeSegment(payload)}.`;

describe("readOrderCloudClientId", () => {
  it("reads cid from an OrderCloud access token", () => {
    expect(readOrderCloudClientId(createToken({ cid: " buyer-client-id " }))).toBe(
      "buyer-client-id",
    );
  });

  it("rejects malformed tokens and tokens without cid", () => {
    expect(() => readOrderCloudClientId("not-a-jwt")).toThrow(
      "Invalid OrderCloud access token",
    );
    expect(() => readOrderCloudClientId(createToken({ usr: "buyer" }))).toThrow(
      "OrderCloud access token is missing cid",
    );
  });
});
