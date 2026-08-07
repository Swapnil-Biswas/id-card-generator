"use server";

process.env.FONTCONFIG_PATH = process.cwd();

import { headers } from "next/headers";
import { createCardId, saveCardRecord } from "@/lib/db";
import { ImageRenderer } from "@/renderer/image-renderer";
import type { GeneratorMode } from "@/renderer/types";
import sharp from "sharp";

export type GenerationResponse =
  | {
      ok: true;
      image: string;
      mimeType: "image/png" | "image/jpeg";
      cardId?: string;
      verifyUrl?: string;
    }
  | { ok: false; error: string };

const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "application/octet-stream",
  "",
]);

export async function generateImageAction(formData: FormData): Promise<GenerationResponse> {
  try {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return { ok: false, error: "Choose a photo first." };
    }
    if (photo.size > 20 * 1024 * 1024) {
      return { ok: false, error: "Please use a photo smaller than 20 MB." };
    }
    if (photo.type && !acceptedTypes.has(photo.type)) {
      return { ok: false, error: "Use a JPG, PNG, WebP, HEIC, or AVIF photo." };
    }

    const mode = (formData.get("mode") === "card" ? "card" : "frame") satisfies GeneratorMode;
    const format = formData.get("format") === "jpeg" ? "jpeg" : "png";
    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const name = String(formData.get("name") ?? "");
    const role = String(formData.get("role") ?? "");
    const title = String(formData.get("title") ?? "");

    let cardId: string | undefined = undefined;
    let verifyUrl: string | undefined = undefined;
    let dbSavePromise: Promise<unknown> | null = null;

    if (mode === "card") {
      const headerList = await headers();
      const host = headerList.get("host") || "localhost:3005";
      const protocol = headerList.get("x-forwarded-proto") || "http";
      cardId = createCardId(name, role, title);
      verifyUrl = `${protocol}://${host}/verify/${cardId}`;

      // Start saving to DB concurrently in background without blocking rendering
      dbSavePromise = (async () => {
        try {
          const resizedPhotoBuffer = await sharp(photoBuffer)
            .rotate()
            .resize(300, 300, { fit: "inside", withoutEnlargement: true })
            .png({ compressionLevel: 3 })
            .toBuffer();
          const photoDataUrl = `data:image/png;base64,${resizedPhotoBuffer.toString("base64")}`;
          await saveCardRecord({
            id: cardId!,
            name: String(formData.get("name") ?? ""),
            role: String(formData.get("role") ?? ""),
            title: String(formData.get("title") ?? ""),
            photoDataUrl,
            createdAt: new Date().toISOString(),
            verifiedInDb: true,
            blockchainVerified: false,
          });
        } catch (dbErr) {
          console.error("DB save error", dbErr);
        }
      })();
    }

    const renderer = new ImageRenderer();
    const renderPromise = renderer.render({
      mode,
      photo: photoBuffer,
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? ""),
      title: String(formData.get("title") ?? ""),
      format,
      qrUrl: verifyUrl,
      transform: {
        zoom: Number(formData.get("zoom") ?? 1),
        x: Number(formData.get("positionX") ?? 0),
        y: Number(formData.get("positionY") ?? 0),
      },
    });

    const [result] = await Promise.all([renderPromise, dbSavePromise]);

    return {
      ok: true,
      image: `data:${result.contentType};base64,${result.buffer.toString("base64")}`,
      mimeType: result.contentType,
      cardId,
      verifyUrl,
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't generate your image. Try a different photo or a smaller file.",
    };
  }
}

export async function normalizePhotoForSegmentationAction(formData: FormData): Promise<GenerationResponse> {
  try {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return { ok: false, error: "Choose a photo first." };
    const converted = await sharp(Buffer.from(await photo.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { ok: true, image: `data:image/jpeg;base64,${converted.toString("base64")}`, mimeType: "image/jpeg" };
  } catch (error) {
    console.error("Photo normalization failed:", error);
    return { ok: false, error: "We couldn't prepare that photo for background removal." };
  }
}
