import { asNonEmptyString, asRecord } from "../normalization";

const decodeJwtPayload = (accessToken: string): Record<string, unknown> => {
  const segments = accessToken.split(".");
  if (segments.length < 2) {
    throw new Error("Invalid OrderCloud access token");
  }

  const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(
    payload.length + ((4 - (payload.length % 4)) % 4),
    "=",
  );

  try {
    const record = asRecord(
      JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as unknown,
    );
    if (!record) {
      throw new Error("Invalid OrderCloud access token");
    }
    return record;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid OrderCloud access token"
    ) {
      throw error;
    }
    throw new Error("Invalid OrderCloud access token");
  }
};

export const readOrderCloudClientId = (accessToken: string): string => {
  const clientId = asNonEmptyString(decodeJwtPayload(accessToken).cid, {
    trim: true,
  });
  if (!clientId) {
    throw new Error("OrderCloud access token is missing cid");
  }
  return clientId;
};
