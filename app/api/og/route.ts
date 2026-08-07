import { NextRequest } from "next/server";
import { getCardRecord } from "@/lib/db";
import { ImageRenderer } from "@/renderer/image-renderer";
import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return new Response("Card ID parameter is missing", { status: 400 });
    }

    const card = await getCardRecord(id);
    if (!card) {
      return new Response("Card not found", { status: 404 });
    }

    // Default placeholder photo if photoDataUrl is not stored
    let photoBuffer: Buffer;
    if (card.photoDataUrl && card.photoDataUrl.startsWith("data:")) {
      const base64Data = card.photoDataUrl.split(",")[1];
      photoBuffer = Buffer.from(base64Data, "base64");
    } else {
      // Clean default placeholder portrait avatar
      photoBuffer = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: { r: 30, g: 61, b: 43, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
    }

    const renderer = new ImageRenderer();
    const host = request.headers.get("host") || "id-card-generator-chi-ochre.vercel.app";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const qrUrl = `${protocol}://${host}/verify/${id}`;

    const rendered = await renderer.render({
      mode: "card",
      photo: photoBuffer,
      name: card.name,
      role: card.role,
      title: card.title,
      format: "png",
      qrUrl,
    });

    const body = new Uint8Array(rendered.buffer.byteLength);
    body.set(rendered.buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("OG Image generation error:", error);
    return new Response("Internal server error generating OG card image", { status: 500 });
  }
}
