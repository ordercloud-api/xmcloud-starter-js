import { describe, expect, it } from 'vitest';
import type { NavigationLinkFields } from '../components/navigation/navigation.props';
import {
  getNavigationItems,
  splitPrimaryAndUtilityItems,
} from '../components/navigation/navigation.utils';

const link = (id: string, name: string, href: string): NavigationLinkFields => ({
  Id: id,
  DisplayName: name,
  Href: href,
});

describe('getNavigationItems', () => {
  it('returns an empty list when fields are missing', () => {
    expect(getNavigationItems()).toEqual([]);
    expect(getNavigationItems({})).toEqual([]);
  });

  it('reads Sitecore navigation fields in authored order', () => {
    expect(
      getNavigationItems({
        home: link('1', 'Home', '/'),
        products: link('2', 'Products', '/products'),
      }).map((item) => item.DisplayName),
    ).toEqual(['Home', 'Products']);
  });
});

describe('splitPrimaryAndUtilityItems', () => {
  it('keeps a single link in the primary group', () => {
    const items = [link('1', 'Home', '/')];
    expect(splitPrimaryAndUtilityItems(items)).toEqual({ primary: items });
  });

  it('places the last authored link on the right as utility chrome', () => {
    const items = [
      link('1', 'Home', '/'),
      link('2', 'Products', '/products'),
      link('3', 'Cart', '/cart'),
    ];
    const { primary, utility } = splitPrimaryAndUtilityItems(items);

    expect(primary.map((item) => item.DisplayName)).toEqual(['Home', 'Products']);
    expect(utility?.DisplayName).toBe('Cart');
  });
});
