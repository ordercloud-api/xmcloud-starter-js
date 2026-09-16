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
  get hasCheckoutService(): boolean {
    return Boolean(process.env.CHECKOUT_SERVICE_URL?.trim());
  },
};
