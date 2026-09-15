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
