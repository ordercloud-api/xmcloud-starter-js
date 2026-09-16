import { NextResponse } from "next/server";
import {
  getCheckoutReadiness,
  type CheckoutReadinessReport,
} from "@/lib/commerce/checkout/readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<CheckoutReadinessReport>> {
  const report = getCheckoutReadiness();
  return NextResponse.json(report, { status: report.ready ? 200 : 503 });
}
