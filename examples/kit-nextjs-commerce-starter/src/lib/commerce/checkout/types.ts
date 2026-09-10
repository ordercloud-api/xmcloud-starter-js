export interface StartCheckoutRequest {
  orderId: string;
}

export interface StartCheckoutResponse {
  attemptId: string;
  redirectUrl: string;
}

export interface CheckoutStatusResponse {
  attemptId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  orderId: string;
}

export class CheckoutServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'CheckoutServiceError';
  }
}
