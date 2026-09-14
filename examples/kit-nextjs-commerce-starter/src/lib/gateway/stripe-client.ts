import 'server-only';
import Stripe from 'stripe';

// Stripe secret keys are per-ApiClient, so the client instance must be keyed by key, not a singleton.
const clients = new Map<string, Stripe>();

export const getStripeClientForApiKey = (apiKey: string): Stripe => {
  let client = clients.get(apiKey);
  if (!client) {
    client = new Stripe(apiKey);
    clients.set(apiKey, client);
  }
  return client;
};
