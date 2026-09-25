import { updateAuthoringField } from "@/lib/sitecore/authoring/client";
import { isValidEditingSecret } from "@/lib/sitecore/authoring/editing-secret";

export const runtime = "nodejs";

type UpdateFieldRequest = {
  dataSource?: unknown;
  fieldName?: unknown;
  language?: unknown;
  value?: unknown;
};

const ALLOWED_FIELDS = new Set([
  "Product ID",
  "Preview Product ID",
  "Products",
]);

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(request: Request) {
  if (!isValidEditingSecret(request.headers.get("x-sitecore-editing-secret"))) {
    return errorResponse(
      "Field updates are available only while authoring",
      403,
    );
  }

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Cross-origin field updates are not allowed", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return errorResponse("Field value is too large", 413);
  }

  let body: UpdateFieldRequest;
  try {
    body = (await request.json()) as UpdateFieldRequest;
  } catch {
    return errorResponse("Invalid JSON request", 400);
  }

  if (
    typeof body.dataSource !== "string" ||
    !body.dataSource.trim() ||
    body.dataSource.length > 500 ||
    typeof body.fieldName !== "string" ||
    !ALLOWED_FIELDS.has(body.fieldName) ||
    typeof body.language !== "string" ||
    !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(body.language) ||
    typeof body.value !== "string"
  ) {
    return errorResponse("The requested field update is not allowed", 400);
  }
  if (body.value.length > 10_000) {
    return errorResponse("Field value is too large", 413);
  }

  try {
    await updateAuthoringField({
      dataSource: body.dataSource,
      fieldName: body.fieldName,
      language: body.language,
      value: body.value,
    });
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Unable to update Sitecore authoring field", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unable to update the field",
      502,
    );
  }
}
