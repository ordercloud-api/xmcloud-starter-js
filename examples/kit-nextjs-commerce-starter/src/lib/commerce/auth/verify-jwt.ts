import "server-only";
import {
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTPayload,
  type KeyLike,
} from "jose";

export interface OrderCloudJwtPayload extends JWTPayload {
  cid?: string;
}

export class JwtVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtVerificationError";
  }
}

interface CachedKey {
  key: KeyLike;
  fetchedAt: number;
}

const publicKeyCache = new Map<string, CachedKey>();
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;

export const clearOrderCloudJwtKeyCache = (): void => {
  publicKeyCache.clear();
};

const fetchPublicKey = async (aud: string, kid: string): Promise<KeyLike> => {
  const cacheKey = `${aud}|${kid}`;
  const cached = publicKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL_MS) {
    return cached.key;
  }

  const certUrl = `${aud.replace(/\/$/, "")}/oauth/certs/${encodeURIComponent(kid)}`;
  const response = await fetch(certUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new JwtVerificationError(
      `Unable to fetch OrderCloud signing key (${response.status}) from ${certUrl}`,
    );
  }

  const jwk = (await response.json()) as JWK & { kid?: string; alg?: string };
  if (!jwk.kty) {
    throw new JwtVerificationError("OrderCloud certs endpoint returned an invalid JWK");
  }

  const alg = jwk.alg ?? "RS256";
  const key = await importJWK({ ...jwk, alg }, alg);
  if (key instanceof Uint8Array) {
    throw new JwtVerificationError(
      "Expected an asymmetric public key from the OrderCloud certs endpoint",
    );
  }

  publicKeyCache.set(cacheKey, { key, fetchedAt: Date.now() });
  return key;
};

export const verifyOrderCloudJwt = async (
  token: string,
): Promise<OrderCloudJwtPayload> => {
  let kid: string | undefined;
  let aud: string | undefined;
  try {
    const header = decodeProtectedHeader(token);
    const unverifiedPayload = decodeJwt(token);
    kid = header.kid;
    aud = Array.isArray(unverifiedPayload.aud)
      ? unverifiedPayload.aud[0]
      : unverifiedPayload.aud;
  } catch {
    throw new JwtVerificationError("Malformed token");
  }

  if (!kid) throw new JwtVerificationError("Token is missing a key id (kid)");
  if (!aud) throw new JwtVerificationError("Token is missing an audience (aud) claim");

  const publicKey = await fetchPublicKey(aud, kid);

  try {
    const { payload } = await jwtVerify(token, publicKey, { audience: aud });
    return payload as OrderCloudJwtPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token verification failed";
    throw new JwtVerificationError(message);
  }
};
