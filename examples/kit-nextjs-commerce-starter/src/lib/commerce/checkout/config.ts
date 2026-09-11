import 'server-only';

const readRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required checkout configuration: ${name}`);
  }

  return value;
};

export const checkoutConfig = {
  get serviceUrl(): string {
    return readRequiredEnvironmentVariable('CHECKOUT_SERVICE_URL').replace(/\/$/, '');
  },
  get stripeSecretKey(): string {
    return readRequiredEnvironmentVariable('STRIPE_SECRET_KEY');
  },
  get stripeWebhookSecret(): string {
    return readRequiredEnvironmentVariable('STRIPE_WEBHOOK_SECRET');
  },
  get connectedAccountId(): string {
    return readRequiredEnvironmentVariable('STRIPE_CONNECTED_ACCOUNT_ID');
  },
  get hasConnectConfig(): boolean {
    return Boolean(
      process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_CONNECTED_ACCOUNT_ID?.trim()
    );
  },
  get hasCheckoutService(): boolean {
    return Boolean(process.env.CHECKOUT_SERVICE_URL?.trim());
  },
  get appUrl(): string {
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl?.trim()) {
      throw new Error(
        'Missing required checkout configuration: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_BASE_URL, or NEXT_PUBLIC_APP_URL'
      );
    }

    return appUrl.trim().replace(/\/$/, '');
  },
};
