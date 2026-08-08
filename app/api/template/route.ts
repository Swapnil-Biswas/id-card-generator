import { NextRequest } from "next/server";
import { TemplateConfig } from "@/config/template";
import { loadOptionalAsset } from "@/lib/assets";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const layer = request.nextUrl.searchParams.get("layer");
  const fileName =
    layer === "overlay"
      ? TemplateConfig.files.cardOverlay
      : layer === "card"
      ? TemplateConfig.files.cardTemplate
      : layer === "frame"
      ? TemplateConfig.files.frame
      : layer === "beachFrame"
      ? (TemplateConfig.files.beachFrame ?? "beac_profile_frame.jpg")
      : layer === "background"
      ? TemplateConfig.files.background
      : undefined;
  if (!fileName) return new Response("Not found", { status: 404 });
  const asset = await loadOptionalAsset(fileName);
  if (!asset) return new Response("Template asset is missing", { status: 404 });
  const contentType = fileName.endsWith(".svg")
    ? "image/svg+xml"
    : fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";
  const body = new Uint8Array(asset.byteLength);
  body.set(asset);
  return new Response(body, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" } });
}
