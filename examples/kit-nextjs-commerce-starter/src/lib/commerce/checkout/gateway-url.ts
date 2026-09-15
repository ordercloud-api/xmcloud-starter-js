const readGatewayOrigin = (): string =>
  (process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL ?? "").trim().replace(/\/$/, "");

/** Empty origin means this Next app (`/stripe/*` rewrites to the PoC API). */
export const getCheckoutGatewayUrl = (path: string): string => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${readGatewayOrigin()}${normalized}`;
};
