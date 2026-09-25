# Product authoring comparison

The starter currently supports two editor experiences against the same Sitecore fields:

1. The existing SitecoreAI Marketplace custom-field app at `/ordercloud-product-picker` and `/ordercloud-product-picker-multiple`.
2. The in-component product selector rendered directly in Pages for `ProductContainer` and `FeaturedProducts`.

Both experiences store only stable OrderCloud IDs. Product names, images, prices, and other details are loaded from OrderCloud at runtime.

## Field values

- `ProductContainer.Product ID`: one plain OrderCloud product ID.
- `ProductContainer.Preview Product ID`: one plain OrderCloud product ID.
- `FeaturedProducts.Products`: one OrderCloud product ID per line, in display order.

Structured JSON values are intentionally unsupported. Existing values must be changed to the formats above.

## SitecoreAI changes for the comparison

Keep the existing Plugin field types and Marketplace app registration while comparing the two experiences. The in-component editor can update the same raw field values through the Authoring and Management API.

After the comparison, if the Marketplace app is removed:

- Change `Product ID` and `Preview Product ID` to Single-Line Text.
- Change `Products` to Multi-Line Text.
- Keep the field names and existing ID-only values unchanged.

No serialized `authoring/items/commerce` changes are included in this implementation.

## Authoring API configuration

Create an environment automation client with access to the Sitecore Authoring and Management GraphQL API, then configure these server-only variables on the editing host:

```text
SITECORE_AUTHORING_HOST=https://your-cm-host
SITECORE_AUTHORING_CLIENT_ID=...
SITECORE_AUTHORING_CLIENT_SECRET=...
```

`SITECORE_AUTHORING_AUTHORITY` and `SITECORE_AUTHORING_AUDIENCE` are optional and default to the SitecoreAI cloud authority and audience.

The automation credential and access token are never sent to the browser. The field API validates the existing `SITECORE_EDITING_SECRET` that Pages supplies when it renders the editing canvas, requires a same-origin browser request, and accepts only the explicitly registered product field names. Add any future reusable authoring field to that server-side allowlist deliberately.

Configure the `SITECORE_AUTHORING_*` variables only on the editing-host deployment. Leave them unset on the public rendering host so that deployment cannot obtain an Authoring API token or perform content writes.

The Authoring API write uses the automation client's service identity. It does not inherit the individual Pages user's Sitecore permissions, so the automation client should be limited to the required environment and content scope.
