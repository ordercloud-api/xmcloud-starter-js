'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useOrderCloud } from '@/contexts/OrderCloudContext';
import type { CommerceCart } from '@/lib/commerce/cart/types';
import { startHostedCheckout } from '@/lib/commerce/checkout/hosted';
import { CHECKOUT_ORDER_ID_STORAGE_KEY } from '@/lib/commerce/checkout/status';
import type { CartProps } from './cart.props';

const formatMoney = (amount?: number, currency?: string): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};

const lineTotal = (quantity: number, unitPrice?: number): number | undefined => {
  if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) return undefined;
  return quantity * unitPrice;
};

export const CartPanel: React.FC = () => {
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
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
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
          <p className="font-medium">Your cart is empty</p>
          <p className="text-muted-foreground text-sm">Add a product, then come back here to check out.</p>
          <Link href="/products" className="text-sm font-semibold underline">
            Continue shopping
          </Link>
        </div>
      )}

      {!loading && payload && payload.items.length > 0 && (
        <>
          <ul className="divide-y rounded-lg border">
            {payload.items.map((item) => {
              const busy = updatingId === item.id;
              return (
                <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatMoney(item.unitPrice, payload.currency)} each
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => void changeQuantity(item.id, item.quantity - 1)}
                        disabled={busy || item.quantity <= 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg leading-none disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                        disabled={busy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg leading-none disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <p className="min-w-20 text-right text-sm font-medium">
                      {formatMoney(lineTotal(item.quantity, item.unitPrice), payload.currency)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      disabled={busy}
                      className="text-muted-foreground text-xs font-semibold underline disabled:opacity-40"
                    >
                      {busy ? 'Updating…' : 'Remove'}
                    </button>
                  </div>
                </li>
              );
            })}
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
};

export const Default: React.FC<CartProps> = ({ params }) => {
  const { page } = useSitecore();
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  return (
    <section
      className={`component cart px-4 py-10 ${params.styles ?? ''}`}
      id={params.RenderingIdentifier}
      data-component="Cart"
      data-class-change
    >
      {isAuthoring && (
        <p className="text-muted-foreground mb-4 text-xs">
          Cart renders live OrderCloud line items. Empty until a shopper adds a product.
        </p>
      )}
      <CartPanel />
    </section>
  );
};
