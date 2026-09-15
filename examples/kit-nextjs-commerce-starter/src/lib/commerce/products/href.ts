import { asNonEmptyString } from "../normalization";
import { isSitecoreWildcardSegment } from "./reference";

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
};

const splitPathAndRest = (
  href: string,
): { pathname: string; rest: string } => {
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const cutIndexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const cutAt = cutIndexes.length ? Math.min(...cutIndexes) : -1;
  if (cutAt < 0) return { pathname: href, rest: "" };
  return { pathname: href.slice(0, cutAt), rest: href.slice(cutAt) };
};

const stripWildcardAndTrailingSlash = (pathname: string): string => {
  const hadLeadingSlash = pathname.startsWith("/");
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const lastSegment = segments.at(-1);
  if (lastSegment && isSitecoreWildcardSegment(decodeSegment(lastSegment))) {
    segments.pop();
  }

  if (segments.length === 0) return "";
  const joined = segments.join("/");
  return hadLeadingSlash ? `/${joined}` : joined;
};

const joinProductPath = (basePath: string, productId: string): string => {
  const encodedId = encodeURIComponent(productId);
  if (!basePath) return `/${encodedId}`;
  return `${basePath.replace(/\/+$/, "")}/${encodedId}`;
};

/**
 * Builds a product detail href whose last path segment is the OrderCloud ID.
 * That segment is what ProductContainer reads in `last-url-segment` mode.
 */
export const buildProductDetailHref = (
  detailPageHref: string | undefined,
  productId: string | undefined,
): string | undefined => {
  const page = asNonEmptyString(detailPageHref, { trim: true });
  const id = asNonEmptyString(productId, { trim: true });
  if (!page || !id) return undefined;

  try {
    const absolute = new URL(page);
    if (HTTP_PROTOCOLS.has(absolute.protocol)) {
      return `${absolute.origin}${joinProductPath(
        stripWildcardAndTrailingSlash(absolute.pathname),
        id,
      )}${absolute.search}${absolute.hash}`;
    }
  } catch {
    // Relative Sitecore paths are the common authoring case.
  }

  const { pathname, rest } = splitPathAndRest(page);
  return `${joinProductPath(stripWildcardAndTrailingSlash(pathname), id)}${rest}`;
};

/**
 * Prefers the author-configured detail page. On the live site, falls back to
 * the current list route so cards still link when that field is unset.
 */
export const resolveProductListDetailPageHref = ({
  configuredHref,
  routePath,
  pathname,
  isAuthoring = false,
}: {
  configuredHref?: string;
  routePath?: readonly string[];
  pathname?: string;
  isAuthoring?: boolean;
}): string | undefined => {
  const configured = asNonEmptyString(configuredHref, { trim: true });
  if (configured) return configured;
  if (isAuthoring) return undefined;

  const segments = routePath?.filter((segment) => segment.trim().length > 0);
  if (segments?.length) return `/${segments.join("/")}`;

  return asNonEmptyString(pathname, { trim: true });
};
