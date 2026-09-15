"use client";

import { useState } from "react";
import NextLink from "next/link";
import type React from "react";
import { Link, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import type { NavigationLinkFields, NavigationProps } from "./navigation.props";
import {
  flattenNavigationItems,
  getNavigationItems,
  isFlatNavigation,
  navigationIncludesCart,
  splitPrimaryAndUtilityItems,
} from "./navigation.utils";

const getTitleField = (fields: NavigationLinkFields) =>
  fields.NavigationTitle?.value
    ? fields.NavigationTitle
    : fields.Title?.value
      ? fields.Title
      : undefined;

const NavigationItem: React.FC<{
  fields: NavigationLinkFields;
  isUtility?: boolean;
  relativeLevel?: number;
}> = ({ fields, isUtility = false, relativeLevel = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleField = getTitleField(fields);
  const hasChildren = Boolean(fields.Children?.length);
  const link = {
    value: {
      href: fields.Href || "",
      title: titleField?.value?.toString() || fields.DisplayName,
      querystring: fields.Querystring || "",
    },
  };

  return (
    <li
      className={`${fields.Styles?.join(" ") ?? ""} rel-level${relativeLevel} group relative ${
        isUtility ? "md:ml-auto" : ""
      }`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        className={`navigation-title flex items-center ${hasChildren ? "child" : ""}`}
      >
        <Link
          field={link}
          className={`inline-flex min-h-11 items-center text-sm font-medium hover:underline ${
            isUtility ? "rounded-md border px-3 py-1.5" : ""
          }`}
        >
          {titleField ? <Text field={titleField} /> : fields.DisplayName}
        </Link>
        {hasChildren && (
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
            aria-expanded={isOpen}
            aria-label={`Toggle ${titleField?.value?.toString() || fields.DisplayName} submenu`}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span aria-hidden="true">⌄</span>
          </button>
        )}
      </div>
      {hasChildren && (
        <ul
          data-open={isOpen || undefined}
          className={`absolute left-0 top-full z-10 min-w-[180px] rounded-md border bg-white p-2 shadow-md ${
            isOpen ? "block" : "hidden"
          }`}
        >
          {fields.Children?.map((child) => (
            <NavigationItem
              key={child.Id}
              fields={child}
              relativeLevel={relativeLevel + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Default: React.FC<NavigationProps> = ({
  fields,
  params,
  page,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { page: sitecorePage } = useSitecore();
  const { styles, RenderingIdentifier: id } = params;
  const isAuthoring =
    page?.mode.isEditing ||
    page?.mode.isDesignLibrary ||
    sitecorePage?.mode.isEditing;
  const resolvedItems = getNavigationItems(fields);
  const items = isFlatNavigation(params.Flattened)
    ? flattenNavigationItems(resolvedItems)
    : resolvedItems;
  const { primary, utility } = splitPrimaryAndUtilityItems(items);

  if (!items.length) {
    if (!isAuthoring) {
      return null;
    }

    return (
      <div
        className={`component navigation w-full border-b px-4 py-3 ${styles ?? ""}`}
        id={id}
        data-class-change
        data-component="Navigation"
      >
        <span className="text-muted-foreground text-sm">Navigation</span>
      </div>
    );
  }

  return (
    <nav
      className={`component navigation w-full border-b bg-white px-4 py-3 ${styles ?? ""}`}
      id={id}
      data-class-change
      data-component="Navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <button
          type="button"
          className="text-sm font-medium md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation-links"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? "Close" : "Menu"}
        </button>
        <ul
          id="site-navigation-links"
          className={`w-full gap-6 md:flex md:flex-row md:items-center ${
            isMenuOpen ? "flex flex-col" : "hidden md:flex"
          }`}
        >
          {primary.map((item) => (
            <NavigationItem key={item.Id} fields={item} />
          ))}
          {utility && (
            <NavigationItem key={utility.Id} fields={utility} isUtility />
          )}
          {!navigationIncludesCart(items) && (
            <li className={utility ? "" : "md:ml-auto"}>
              <NextLink
                href="/cart"
                className="inline-flex min-h-11 items-center text-sm font-medium hover:underline"
              >
                Cart
              </NextLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};
