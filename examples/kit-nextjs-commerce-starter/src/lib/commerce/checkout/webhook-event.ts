export const readClientIdFromRawEvent = (rawBody: string): string | null => {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: { object?: { metadata?: { ClientID?: unknown } } };
    };
    const clientId = parsed.data?.object?.metadata?.ClientID;
    return typeof clientId === "string" && clientId.trim() ? clientId.trim() : null;
  } catch {
    return null;
  }
};

export const readEventTypeFromRawEvent = (rawBody: string): string | null => {
  try {
    const parsed = JSON.parse(rawBody) as { type?: unknown };
    return typeof parsed.type === "string" && parsed.type.trim() ? parsed.type.trim() : null;
  } catch {
    return null;
  }
};

export const isCheckoutSessionEventType = (type: string | null): boolean =>
  Boolean(type?.startsWith("checkout.session."));
