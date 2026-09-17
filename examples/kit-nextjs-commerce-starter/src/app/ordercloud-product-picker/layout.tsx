'use client';

import { OrderCloudProvider } from '@/contexts/OrderCloudContext';

export default function OrderCloudProductPickerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrderCloudProvider>{children}</OrderCloudProvider>;
}
