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

export const navigationPlaceholderId = (
  dynamicPlaceholderId?: string,
): string => {
  const trimmed = dynamicPlaceholderId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "0";
};

export const navigationLogoPlaceholderName = (
  dynamicPlaceholderId?: string,
): string => `navigation-logo-${navigationPlaceholderId(dynamicPlaceholderId)}`;

export const navigationRightPlaceholderName = (
  dynamicPlaceholderId?: string,
): string => `navigation-right-${navigationPlaceholderId(dynamicPlaceholderId)}`;
