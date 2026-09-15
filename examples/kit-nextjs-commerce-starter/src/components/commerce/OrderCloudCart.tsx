'use client';

import { useEffect, useState } from 'react';
import { useOrderCloud } from '@/contexts/OrderCloudContext';
import type { CommerceCart } from '@/lib/commerce/cart/types';
import { CHECKOUT_ORDER_ID_STORAGE_KEY } from '@/lib/commerce/checkout/status';

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

type CheckoutPayload = {
  orderId?: string;
  redirectUrl?: string;
  error?: string;
};

export default function OrderCloudCart() {
  const { accessToken, cart, status, error: sessionError } = useOrderCloud();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CommerceCart | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);

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

  const startStripeCheckout = async () => {
    setStartingCheckout(true);
    setCheckoutError(null);
    setCheckout(null);

    try {
      if (!accessToken) {
        throw new Error('Create an anonymous session first.');
      }

      const response = await fetch('/api/commerce/stripe/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = (await response.json()) as CheckoutPayload;
      if (!response.ok || !result.redirectUrl) {
        throw new Error(result.error || `Checkout failed with ${response.status}`);
      }

      setCheckout(result);
      if (result.orderId) {
        sessionStorage.setItem(CHECKOUT_ORDER_ID_STORAGE_KEY, result.orderId);
      }
      window.location.assign(result.redirectUrl);
    } catch (checkoutStartError) {
      setCheckoutError(
        checkoutStartError instanceof Error ? checkoutStartError.message : 'Checkout failed'
      );
    } finally {
      setStartingCheckout(false);
    }
  };

  const removeItem = async (lineItemId: string) => {
    setRemovingId(lineItemId);
    setError(null);
    try {
      await cart.removeItem(lineItemId);
      setRefreshSeed((value) => value + 1);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Cart</h2>
        <button
          type="button"
          onClick={() => setRefreshSeed((value) => value + 1)}
          disabled={loading}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && <p className="text-muted-foreground">Loading cart...</p>}
      {!loading && error && <p className="text-red-700">{error}</p>}
      {!loading && !error && payload && payload.items.length === 0 && (
        <p className="text-muted-foreground">Cart is empty. Add a product, then refresh.</p>
      )}
      {!loading && !error && payload && payload.items.length > 0 && (
        <>
          <ul className="space-y-2">
            {payload.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {formatMoney(item.unitPrice, payload.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeItem(item.id)}
                  disabled={removingId === item.id}
                  className="text-xs font-semibold underline disabled:opacity-60"
                >
                  {removingId === item.id ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs font-medium">Total {formatMoney(payload.total, payload.currency)}</p>
        </>
      )}

      <div className="space-y-2 border-t pt-3">
        <button
          type="button"
          onClick={() => void startStripeCheckout()}
          disabled={startingCheckout || loading || !payload?.items.length}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {startingCheckout ? 'Starting checkout...' : 'Start Stripe checkout'}
        </button>
        {checkoutError && <p className="text-red-700">{checkoutError}</p>}
        {checkout?.orderId && <p className="text-muted-foreground text-xs">Order {checkout.orderId}</p>}
        {checkout?.redirectUrl && (
          <a className="block text-sm font-medium underline" href={checkout.redirectUrl}>
            Open Stripe checkout
          </a>
        )}
      </div>
    </section>
  );
}
