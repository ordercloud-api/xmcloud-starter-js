# Sitecore Content SDK Next.js Commerce Starter

## Overview

This is the commerce Next.js (App Router) starter: XM Cloud layout rendering plus OrderCloud product, cart, and checkout APIs.

Sitecore Pages uses `/` via the catch-all route. Local commerce diagnostics live at `/test` and `/oc-test`.

## How to Run This Starter Locally

Follow the [root README — How to Run a Next.js Starter Locally](../../README.md#how-to-run-a-nextjs-starter-locally), using this path: **`examples/kit-nextjs-commerce-starter`**.

Optional: for stable absolute URLs in server-rendered code when the request has no `Host` header, set `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_BASE_URL` (see [`.env.remote.example`](.env.remote.example)).

From the repo root:

```bash
cd examples/kit-nextjs-commerce-starter
npm install
npm run dev
```

Open **http://localhost:3000**.

## Documentation

- [Skills: capability map for this starter](Skills.md) — High-level capability groupings; see also the repo [docs/Skills.md](../../docs/Skills.md).
- [Sitecore Content SDK for XM Cloud](https://doc.sitecore.com/xmc/en/developers/content-sdk/sitecore-content-sdk-for-xm-cloud.html)
