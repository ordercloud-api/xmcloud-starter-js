type HostedCheckoutResult = {
  orderId?: string;
  redirectUrl?: string;
  error?: string;
};

export const startHostedCheckout = async (
  accessToken: string,
): Promise<{ orderId?: string; redirectUrl: string }> => {
  const response = await fetch("/stripe/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json()) as HostedCheckoutResult;
  if (!response.ok || !payload.redirectUrl) {
    throw new Error(payload.error || `Checkout failed with ${response.status}`);
  }

  return {
    orderId: payload.orderId,
    redirectUrl: payload.redirectUrl,
  };
};
