'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CartLineRow from '@/components/commerce/CartLineRow';
import { useOrderCloud } from '@/contexts/OrderCloudContext';
import { formatMoney } from '@/lib/commerce/cart/format';
import type { CommerceCart } from '@/lib/commerce/cart/types';
import { startHostedCheckout } from '@/lib/commerce/checkout/hosted';
import { CHECKOUT_ORDER_ID_STORAGE_KEY } from '@/lib/commerce/checkout/status';
import { buildProductDetailHref } from '@/lib/commerce/products/href';
import { CATALOG_LIST_HREF } from '@/lib/commerce/products/list-source';

export default function ShoppingCart() {
  const { accessToken, cart, status, error: sessionError } = useOrderCloud();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CommerceCart | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setPayload(null);
      setError(status === 'error' ? sessionError?.message ?? 'Unable to start commerce session' : null);
      setLoading(status === 'loading');
      return;
    }

    let active = true;
    setLoading(true);

    void cart
      .get()
      .then((nextCart) => {
        if (!active) return;
        setPayload(nextCart);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setPayload(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load cart');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cart, refreshSeed, sessionError, status]);

  const checkout = async () => {
    setStartingCheckout(true);
    setCheckoutError(null);

    try {
      if (!accessToken) {
        throw new Error('Unable to start checkout without a shopper session.');
      }

      const result = await startHostedCheckout(accessToken);
      if (result.orderId) {
        sessionStorage.setItem(CHECKOUT_ORDER_ID_STORAGE_KEY, result.orderId);
      }
      window.location.assign(result.redirectUrl);
    } catch (checkoutStartError) {
      setCheckoutError(
        checkoutStartError instanceof Error ? checkoutStartError.message : 'Checkout failed',
      );
    } finally {
      setStartingCheckout(false);
    }
  };

  const changeQuantity = async (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingId(lineItemId);
    setError(null);
    try {
      await cart.updateItem({ lineItemId, quantity });
      setRefreshSeed((value) => value + 1);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (lineItemId: string) => {
    setUpdatingId(lineItemId);
    setError(null);
    try {
      await cart.removeItem(lineItemId);
      setRefreshSeed((value) => value + 1);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  const itemCount = payload?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const isBusy = loading || startingCheckout;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Shopping Cart</h1>
        {!loading && payload && payload.items.length > 0 && (
          <p className="text-muted-foreground mt-1 text-sm">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        )}
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading cart…</p>}
      {!loading && error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && payload && payload.items.length === 0 && (
        <div className="space-y-3 rounded-lg border px-5 py-8">
          <p className="font-medium">Your shopping cart is empty</p>
          <p className="text-muted-foreground text-sm">Add a product, then come back here to check out.</p>
          <Link href="/products" className="text-sm font-semibold underline">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && payload && payload.items.length > 0 && (
        <>
          <ul className="divide-y rounded-lg border">
            {payload.items.map((item) => (
              <CartLineRow
                key={item.id}
                item={item}
                currency={payload.currency}
                href={buildProductDetailHref(CATALOG_LIST_HREF, item.productId)}
                busy={updatingId === item.id}
                onChangeQuantity={(lineItemId, quantity) => {
                  void changeQuantity(lineItemId, quantity);
                }}
                onRemove={(lineItemId) => {
                  void removeItem(lineItemId);
                }}
              />
            ))}
          </ul>

          <div className="ml-auto w-full max-w-sm space-y-2">
            {typeof payload.subtotal === 'number' && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(payload.subtotal, payload.currency)}</span>
              </div>
            )}
            {typeof payload.taxCost === 'number' && payload.taxCost > 0 && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatMoney(payload.taxCost, payload.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(payload.total, payload.currency)}</span>
            </div>
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={isBusy}
              className="border-primary bg-primary text-primary-foreground hover:opacity-90 mt-4 w-full rounded-md border px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingCheckout ? 'Starting checkout…' : 'Checkout'}
            </button>
            <p className="text-center">
              <Link href="/products" className="text-muted-foreground text-sm underline">
                Continue shopping
              </Link>
            </p>
            {checkoutError && <p className="text-sm text-red-700">{checkoutError}</p>}
          </div>
        </>
      )}
    </div>
  );
}
