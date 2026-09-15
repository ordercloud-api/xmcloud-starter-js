import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">Checkout cancelled</h1>
      <p className="text-muted-foreground text-sm">
        No payment was taken. Your cart is still available.
      </p>
      <Link href="/cart" className="text-sm underline">
        Back to cart
      </Link>
    </main>
  );
}
