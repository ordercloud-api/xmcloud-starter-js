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
