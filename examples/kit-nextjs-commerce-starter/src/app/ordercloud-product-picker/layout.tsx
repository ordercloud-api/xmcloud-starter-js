"use client";

import StandaloneCommerceProvider from "@/contexts/StandaloneCommerceProvider";

export default function OrderCloudProductPickerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StandaloneCommerceProvider editing>{children}</StandaloneCommerceProvider>
  );
}
