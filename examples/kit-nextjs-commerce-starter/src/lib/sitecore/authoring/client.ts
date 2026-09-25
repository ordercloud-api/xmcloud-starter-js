import "server-only";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type GraphQLError = {
  message?: string;
};

type GraphQLResponse = {
  data?: {
    updateItem?: {
      item?: {
        itemId?: string;
      };
    };
  };
  errors?: GraphQLError[];
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | undefined;

const read = (name: string): string => process.env[name]?.trim() ?? "";
const withoutTrailingSlash = (value: string): string =>
  value.replace(/\/$/, "");

const getConfig = () => {
  const host = withoutTrailingSlash(read("SITECORE_AUTHORING_HOST"));
  const clientId = read("SITECORE_AUTHORING_CLIENT_ID");
  const clientSecret = read("SITECORE_AUTHORING_CLIENT_SECRET");
  const authority = withoutTrailingSlash(
    read("SITECORE_AUTHORING_AUTHORITY") || "https://auth.sitecorecloud.io",
  );
  const audience =
    read("SITECORE_AUTHORING_AUDIENCE") || "https://api.sitecorecloud.io";

  if (!host || !clientId || !clientSecret) {
    throw new Error(
      "Sitecore authoring is not configured. Set SITECORE_AUTHORING_HOST, SITECORE_AUTHORING_CLIENT_ID, and SITECORE_AUTHORING_CLIENT_SECRET.",
    );
  }

  return { host, clientId, clientSecret, authority, audience };
};

const getAccessToken = async (fetcher: typeof fetch): Promise<string> => {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const config = getConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    audience: config.audience,
    grant_type: "client_credentials",
  });
  const response = await fetcher(`${config.authority}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Unable to authorize Sitecore field update (${response.status})`,
    );
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) {
    throw new Error(
      "Sitecore authorization response did not include an access token",
    );
  }

  cachedToken = {
    value: token.access_token,
    expiresAt: now + Math.max(token.expires_in ?? 900, 60) * 1000,
  };
  return cachedToken.value;
};

const UPDATE_FIELD_MUTATION = `
  mutation UpdateAuthoringField($input: UpdateItemInput!) {
    updateItem(input: $input) {
      item {
        itemId
      }
    }
  }
`;

export const updateAuthoringField = async (
  {
    dataSource,
    fieldName,
    language,
    value,
  }: {
    dataSource: string;
    fieldName: string;
    language: string;
    value: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<void> => {
  const config = getConfig();
  const accessToken = await getAccessToken(fetcher);
  const isItemId = /^\{?[0-9a-f]{8}-[0-9a-f-]{27}\}?$/i.test(dataSource);
  const input = {
    database: "master",
    language,
    ...(isItemId ? { itemId: dataSource } : { path: dataSource }),
    fields: [{ name: fieldName, value, reset: false }],
  };

  const response = await fetcher(
    `${config.host}/sitecore/api/authoring/graphql/v1/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: UPDATE_FIELD_MUTATION,
        variables: { input },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Sitecore field update failed (${response.status})`);
  }

  const result = (await response.json()) as GraphQLResponse;
  if (result.errors?.length || !result.data?.updateItem?.item?.itemId) {
    throw new Error(
      result.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join("; ") || "Sitecore did not confirm the field update",
    );
  }
};

export const resetAuthoringTokenCacheForTests = (): void => {
  cachedToken = undefined;
};
