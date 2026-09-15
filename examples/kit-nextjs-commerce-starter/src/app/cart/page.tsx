'use client';

import { CartPanel } from '@/components/cart/Cart';
import { OrderCloudProvider } from '@/contexts/OrderCloudContext';

export default function CartPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <OrderCloudProvider>
        <CartPanel />
      </OrderCloudProvider>
    </main>
  );
}
