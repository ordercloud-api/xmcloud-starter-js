'use client';

import { useState } from 'react';
import type React from 'react';
import { Link, Text } from '@sitecore-content-sdk/nextjs';
import type { NavigationLinkFields, NavigationProps } from './navigation.props';

const getTitleField = (fields: NavigationLinkFields) =>
  fields.NavigationTitle?.value ? fields.NavigationTitle : fields.Title?.value ? fields.Title : undefined;

const NavigationItem: React.FC<{ fields: NavigationLinkFields }> = ({ fields }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleField = getTitleField(fields);
  const hasChildren = Boolean(fields.Children?.length);
  const link = {
    value: {
      href: fields.Href || '',
      title: titleField?.value?.toString() || fields.DisplayName,
      querystring: fields.Querystring || '',
    },
  };

  return (
    <li className="group relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <Link field={link} className="text-sm font-medium hover:underline">
        {titleField ? <Text field={titleField} /> : fields.DisplayName}
      </Link>
      {hasChildren && (
        <ul
          className={`absolute left-0 top-full z-10 min-w-[180px] rounded-md border bg-white p-2 shadow-md ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          {fields.Children?.map((child) => (
            <NavigationItem key={child.Id} fields={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Default: React.FC<NavigationProps> = ({ fields, params }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { styles, RenderingIdentifier: id } = params;
  const items = fields ? Object.values(fields) : [];

  if (!items.length) {
    return (
      <div className={`w-full ${styles ?? ''}`} id={id} data-component="Navigation">
        <span className="text-muted-foreground text-sm">Navigation</span>
      </div>
    );
  }

  return (
    <nav className={`w-full ${styles ?? ''}`} id={id} data-component="Navigation">
      <button
        type="button"
        className="text-sm font-medium md:hidden"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        Menu
      </button>
      <ul className={`gap-6 md:flex md:items-center ${isMenuOpen ? 'flex flex-col' : 'hidden'}`}>
        {items.map((item) => (
          <NavigationItem key={item.Id} fields={item} />
        ))}
      </ul>
    </nav>
  );
};
