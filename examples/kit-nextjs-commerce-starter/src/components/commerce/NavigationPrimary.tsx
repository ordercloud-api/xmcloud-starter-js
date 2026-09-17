"use client";

import { useState } from "react";
import type React from "react";
import { Link, Text } from "@sitecore-content-sdk/nextjs";
import type { NavigationLinkFields } from "@/components/navigation/navigation.props";

const getTitleField = (fields: NavigationLinkFields) =>
  fields.NavigationTitle?.value
    ? fields.NavigationTitle
    : fields.Title?.value
      ? fields.Title
      : undefined;

const NavigationItem: React.FC<{
  fields: NavigationLinkFields;
  relativeLevel?: number;
}> = ({ fields, relativeLevel = 1 }) => {
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
      className={`${fields.Styles?.join(" ") ?? ""} rel-level${relativeLevel} group relative`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        className={`navigation-title flex items-center ${hasChildren ? "child" : ""}`}
      >
        <Link
          field={link}
          className="inline-flex min-h-11 items-center text-sm font-medium hover:underline"
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

export const NavigationPrimary: React.FC<{
  items: NavigationLinkFields[];
}> = ({ items }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!items.length) return null;

  return (
    <>
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
        {items.map((item) => (
          <NavigationItem key={item.Id} fields={item} />
        ))}
      </ul>
    </>
  );
};
