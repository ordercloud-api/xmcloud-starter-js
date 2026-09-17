import type React from "react";
import Link from "next/link";
import {
  isShowCartLinkEnabled,
  resolveCartButtonDestination,
} from "@/lib/commerce/cart/destination";
import type { CartButtonProps } from "./cart-button.props";

const CART_LABEL = "Cart";

const CartBagIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 7h12l-1 13H7L6 7Z" />
    <path d="M9 7V6a3 3 0 0 1 6 0v1" />
  </svg>
);

export const Default: React.FC<CartButtonProps> = ({ params, page }) => {
  const { href } = resolveCartButtonDestination(
    params,
    page.layout?.sitecore?.route,
  );
  const showCartLink = isShowCartLinkEnabled(params);

  return (
    <div
      className={`component cart-button ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="CartButton"
      data-class-change
    >
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:underline"
        aria-label={showCartLink ? undefined : CART_LABEL}
      >
        <CartBagIcon />
        {showCartLink ? <span>{CART_LABEL}</span> : null}
      </Link>
    </div>
  );
};
