import 'server-only';
import { verifyOrderCloudJwt } from './jwt';
import { getStripeClientConfig, setMarketplaceOwner } from './config-store';

export class GatewayAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'GatewayAuthError';
  }
}

const ADMIN_ROLE = 'ApiClientAdmin';

const parseRoles = (role: unknown): string[] => {
  if (typeof role === 'string') return role.split(/\s+/).filter(Boolean);
  if (Array.isArray(role)) return role.filter((r): r is string => typeof r === 'string');
  return [];
};

// Enforces ApiClientAdmin + MarketplaceID ownership per the contract's admin config authZ model.
export const assertAdminAccessToClient = async (token: string, clientId: string): Promise<void> => {
  const payload = await verifyOrderCloudJwt(token);

  if (!parseRoles(payload.role).includes(ADMIN_ROLE)) {
    throw new GatewayAuthError(`Missing required role: ${ADMIN_ROLE}`, 403);
  }

  const adminMarketplaceId = typeof payload.MarketplaceID === 'string' ? payload.MarketplaceID : undefined;
  if (!adminMarketplaceId) {
    throw new GatewayAuthError('Admin token is missing a MarketplaceID claim', 403);
  }

  const existing = getStripeClientConfig(clientId);
  if (existing?.marketplaceId) {
    if (existing.marketplaceId !== adminMarketplaceId) {
      throw new GatewayAuthError("client_id does not belong to the admin's marketplace", 403);
    }
    return;
  }

  // PoC stub for the real "does client_id's ApiClient belong to this MarketplaceID" CoreAPI
  // lookup: the first admin write for an unseen client_id establishes its ownership record.
  setMarketplaceOwner(clientId, adminMarketplaceId);
};
