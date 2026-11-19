const DEFAULT_LEGACY_COOKIE_NAME = "oc_anonymous_token";

export const clearLegacyOrderCloudToken = (): void => {
  if (typeof document === "undefined") return;
  const configuredName =
    process.env.NEXT_PUBLIC_ORDERCLOUD_AUTH_COOKIE_NAME?.trim();
  const cookieName = configuredName || DEFAULT_LEGACY_COOKIE_NAME;
  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(cookieName)) return;
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
};
