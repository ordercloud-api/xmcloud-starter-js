"use client";

import type { ReactNode } from "react";
import {
  LayoutServicePageState,
  SitecoreProvider,
  type Page,
} from "@sitecore-content-sdk/nextjs";
import scConfig from "sitecore.config";
import { OrderCloudProvider } from "./OrderCloudContext";

const createStandalonePage = (editing: boolean): Page => ({
  layout: {
    sitecore: {
      context: {},
      route: null,
    },
  },
  siteName: scConfig.defaultSite,
  locale: scConfig.defaultLanguage,
  mode: {
    name: editing ? LayoutServicePageState.Edit : LayoutServicePageState.Normal,
    designLibrary: { isVariantGeneration: false },
    isNormal: !editing,
    isPreview: false,
    isEditing: editing,
    isDesignLibrary: false,
  },
});

export default function StandaloneCommerceProvider({
  children,
  editing = false,
}: {
  children: ReactNode;
  editing?: boolean;
}) {
  return (
    <SitecoreProvider
      api={scConfig.api}
      page={createStandalonePage(editing)}
      componentMap={new Map()}
    >
      <OrderCloudProvider>{children}</OrderCloudProvider>
    </SitecoreProvider>
  );
}
