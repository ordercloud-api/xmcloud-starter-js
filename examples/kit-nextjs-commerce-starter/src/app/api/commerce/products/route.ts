import { NextRequest, NextResponse } from "next/server";
import {
  requestAnonymousOrderCloudToken,
  runOrderCloudOperation,
} from "@/lib/commerce/client";
import { ProductsService } from "@/lib/commerce/products/service";
import type { CommerceProductList } from "@/lib/commerce/products/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CommerceProductList | { error: string }>> {
  try {
    const { accessToken } = await requestAnonymousOrderCloudToken();
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const requestedPage = Number(request.nextUrl.searchParams.get("page"));
    const requestedPageSize = Number(
      request.nextUrl.searchParams.get("pageSize"),
    );
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(requestedPageSize, 50)
        : 20;
    const products = new ProductsService((operation) =>
      runOrderCloudOperation(operation, { accessToken }),
    );
    return NextResponse.json(await products.list({ search, page, pageSize }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load OrderCloud products";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
