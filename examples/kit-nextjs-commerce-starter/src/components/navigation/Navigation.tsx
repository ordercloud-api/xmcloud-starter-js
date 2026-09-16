"use client";

import { useState } from "react";
import type React from "react";
import { Link, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
import type { NavigationLinkFields, NavigationProps } from "./navigation.props";
import {
  flattenNavigationItems,
  getNavigationItems,
  isFlatNavigation,
} from "./navigation.utils";
import {
  getCartDestination,
  partitionNavigationItems,
} from "@/lib/commerce/cart/destination";

const getTitleField = (fields: NavigationLinkFields) =>
  fields.NavigationTitle?.value
    ? fields.NavigationTitle
    : fields.Title?.value
      ? fields.Title
      : undefined;

const NavigationItem: React.FC<{
  fields: NavigationLinkFields;
  variant?: "link" | "cart";
  relativeLevel?: number;
}> = ({ fields, variant = "link", relativeLevel = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleField = getTitleField(fields);
  const hasChildren = Boolean(fields.Children?.length);
  const isCart = variant === "cart";
  const link = {
    value: {
      href: fields.Href || "",
      title: titleField?.value?.toString() || fields.DisplayName,
      querystring: fields.Querystring || "",
    },
  };

  return (
    <li
      className={`${fields.Styles?.join(" ") ?? ""} rel-level${relativeLevel} group relative`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        className={`navigation-title flex items-center ${hasChildren ? "child" : ""}`}
      >
        <Link
          field={link}
          className={`inline-flex min-h-11 items-center text-sm font-medium hover:underline ${
            isCart ? "rounded-md border px-3 py-1.5" : ""
          }`}
        >
          {titleField ? <Text field={titleField} /> : fields.DisplayName}
        </Link>
        {hasChildren && !isCart && (
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
      {hasChildren && !isCart && (
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
  const destination = getCartDestination(params);
  const { primary, cart } = partitionNavigationItems(items, destination);

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
      <div className="mx-auto flex max-w-6xl items-center gap-4">
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
          className={`min-w-0 flex-1 gap-6 md:flex md:flex-row md:items-center ${
            isMenuOpen ? "flex flex-col" : "hidden md:flex"
          }`}
        >
          {primary.map((item) => (
            <NavigationItem key={item.Id} fields={item} />
          ))}
        </ul>
        {cart && (
          <ul className="shrink-0">
            <NavigationItem fields={cart} variant="cart" />
          </ul>
        )}
      </div>
    </nav>
  );
};
