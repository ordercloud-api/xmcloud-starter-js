import type { NavigationLinkFields } from "./navigation.props";

export const getNavigationItems = (
  fields?: Record<string, NavigationLinkFields>,
): NavigationLinkFields[] =>
  fields ? Object.values(fields).filter(Boolean) : [];

export const flattenNavigationItems = (
  items: NavigationLinkFields[],
): NavigationLinkFields[] =>
  items.flatMap(({ Children, ...item }) => [
    item,
    ...flattenNavigationItems(Children ?? []),
  ]);

export const isFlatNavigation = (flattened?: string): boolean =>
  flattened === "1";

/**
 * Treat the last authored link as utility chrome (Cart) so Home/Products stay left.
 * Labels and hrefs still come from Sitecore; this is layout only.
 */
export const splitPrimaryAndUtilityItems = <T>(
  items: T[],
): { primary: T[]; utility?: T } => {
  if (items.length === 0) {
    return { primary: [] };
  }

  if (items.length === 1) {
    return { primary: items };
  }

  return {
    primary: items.slice(0, -1),
    utility: items[items.length - 1],
  };
};
