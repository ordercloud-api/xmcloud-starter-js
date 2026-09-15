import { describe, expect, it } from "vitest";
import { readClientIdFromRawEvent } from "../lib/commerce/checkout/webhook-event";
import {
  isTerminalCheckoutStatus,
  toGatewayCheckoutStatus,
} from "../lib/commerce/checkout/status";

describe("readClientIdFromRawEvent", () => {
  it("reads unverified metadata.ClientID for vault lookup", () => {
    expect(
      readClientIdFromRawEvent(
        JSON.stringify({
          data: { object: { metadata: { ClientID: "buyer-client-id", OrderID: "order-1" } } },
        }),
      ),
    ).toBe("buyer-client-id");
  });

  it("returns null for invalid payloads", () => {
    expect(readClientIdFromRawEvent("{")).toBeNull();
    expect(readClientIdFromRawEvent(JSON.stringify({ data: { object: {} } }))).toBeNull();
  });
});

describe("gateway checkout status", () => {
  it("normalizes mixed-case xp values", () => {
    expect(toGatewayCheckoutStatus("pending")).toBe("Pending");
    expect(toGatewayCheckoutStatus("Completed")).toBe("Completed");
    expect(toGatewayCheckoutStatus("FAILED")).toBe("Failed");
    expect(isTerminalCheckoutStatus("completed")).toBe(true);
    expect(isTerminalCheckoutStatus("Pending")).toBe(false);
  });
});
