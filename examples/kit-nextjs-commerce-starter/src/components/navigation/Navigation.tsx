import type React from "react";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import { NavigationPrimary } from "@/components/commerce/NavigationPrimary";
import type { NavigationProps } from "./navigation.props";
import {
  flattenNavigationItems,
  getNavigationItems,
  isFlatNavigation,
  navigationLogoPlaceholderName,
  navigationRightPlaceholderName,
} from "./navigation.utils";
import {
  getCartDestination,
  partitionNavigationItems,
} from "@/lib/commerce/cart/destination";

export const Default: React.FC<NavigationProps> = ({
  fields,
  params,
  page,
  rendering,
}) => {
  const { styles, RenderingIdentifier: id } = params;
  const resolvedItems = getNavigationItems(fields);
  const items = isFlatNavigation(params.Flattened)
    ? flattenNavigationItems(resolvedItems)
    : resolvedItems;
  const destination = getCartDestination(params);
  const { primary } = partitionNavigationItems(items, destination);
  const placeholderId = params.DynamicPlaceholderId;
  const logoPlaceholder = navigationLogoPlaceholderName(placeholderId);
  const rightPlaceholder = navigationRightPlaceholderName(placeholderId);

  return (
    <nav
      className={`component navigation w-full border-b bg-white px-4 py-3 ${styles ?? ""}`}
      id={id}
      data-class-change
      data-component="Navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="flex max-h-10 max-w-32 shrink-0 items-center overflow-hidden [&_figure]:w-auto [&_img]:h-auto [&_img]:max-h-10 [&_img]:w-auto [&_img]:object-contain">
          <AppPlaceholder
            name={logoPlaceholder}
            rendering={rendering}
            page={page}
            componentMap={componentMap}
          />
        </div>
        <NavigationPrimary items={primary} />
        <div className="ml-auto shrink-0">
          <AppPlaceholder
            name={rightPlaceholder}
            rendering={rendering}
            page={page}
            componentMap={componentMap}
          />
        </div>
      </div>
    </nav>
  );
};
