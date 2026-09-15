import { afterEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from "jose";
import {
  JwtVerificationError,
  clearOrderCloudJwtKeyCache,
  verifyOrderCloudJwt,
} from "../lib/commerce/auth/verify-jwt";

const AUD = "https://sandboxapi.ordercloud.io";
const KID = "test-key-1";

afterEach(() => {
  clearOrderCloudJwtKeyCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mintToken = async (
  privateKey: KeyLike,
  claims: Record<string, unknown> = {},
  {
    audience = AUD,
    kid = KID,
    expiresIn = "5m",
  }: { audience?: string; kid?: string; expiresIn?: string } = {},
) =>
  new SignJWT({ cid: "buyer-client-1", ...claims })
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .sign(privateKey);

describe("verifyOrderCloudJwt", () => {
  it("verifies a token signed with the key served from {aud}/oauth/certs/{kid}", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await mintToken(privateKey);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...publicJwk, alg: "RS256", kid: KID }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = await verifyOrderCloudJwt(token);

    expect(payload.cid).toBe("buyer-client-1");
    expect(fetchMock).toHaveBeenCalledWith(`${AUD}/oauth/certs/${KID}`, expect.any(Object));
  });

  it("rejects a token whose signature does not match the fetched public key", async () => {
    const { publicKey } = await generateKeyPair("RS256");
    const { privateKey: otherPrivateKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const tamperedToken = await mintToken(otherPrivateKey);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...publicJwk, alg: "RS256", kid: KID }),
      }),
    );

    await expect(verifyOrderCloudJwt(tamperedToken)).rejects.toBeInstanceOf(JwtVerificationError);
  });

  it("rejects an expired token", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const expiredToken = await mintToken(privateKey, {}, { expiresIn: "-1s" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...publicJwk, alg: "RS256", kid: KID }),
      }),
    );

    await expect(verifyOrderCloudJwt(expiredToken)).rejects.toBeInstanceOf(JwtVerificationError);
  });

  it("rejects a malformed token before attempting any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyOrderCloudJwt("not-a-jwt")).rejects.toBeInstanceOf(JwtVerificationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
