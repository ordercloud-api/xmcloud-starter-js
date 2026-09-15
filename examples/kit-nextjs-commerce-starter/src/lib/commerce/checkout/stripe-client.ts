import "server-only";
import Stripe from "stripe";

const clients = new Map<string, Stripe>();

export const getStripeClientForApiKey = (apiKey: string): Stripe => {
  let client = clients.get(apiKey);
  if (!client) {
    client = new Stripe(apiKey);
    clients.set(apiKey, client);
  }
  return client;
};
