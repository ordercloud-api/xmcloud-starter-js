'use client';

import { OrderCloudProvider } from '@/contexts/OrderCloudContext';

export default function OrderCloudProductPickerMultipleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrderCloudProvider>{children}</OrderCloudProvider>;
}
