"use server";

import { headers } from "next/headers";
import { TemplateConfig } from "@/config/template";
import { createCardId, saveCardRecord } from "@/lib/db";
import { ImageRenderer } from "@/renderer/image-renderer";
import sharp from "sharp";

export interface GenerateActionResponse {
  ok: boolean;
  image: string;
  cardId?: string;
  verifyUrl?: string;
  error?: string;
}

export async function generateImageAction(formData: FormData): Promise<GenerateActionResponse> {
  try {
    const mode = (formData.get("mode") ?? "card") as "frame" | "card";
    const format = (formData.get("format") ?? "png") as "png" | "jpeg";
    const photoFile = formData.get("photo") as File | null;

    if (!photoFile) {
      return { ok: false, image: "", error: "Choose a photo to continue." };
    }

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!acceptedTypes.includes(photoFile.type.toLowerCase())) {
      return { ok: false, image: "", error: "Unsupported image format. Please upload JPG, PNG, WEBP, or HEIC." };
    }

    const maxFileSize = 15 * 1024 * 1024; // 15MB
    if (photoFile.size > maxFileSize) {
      return { ok: false, image: "", error: "Photo file size too large. Maximum size is 15MB." };
    }

    const photoArrayBuffer = await photoFile.arrayBuffer();
    const photoBuffer = Buffer.from(photoArrayBuffer);

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
            .resize(200, 200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
      name,
      role,
      title,
      format,
      qrUrl: verifyUrl,
      transform: {
        zoom: Number(formData.get("zoom") ?? 1),
        x: Number(formData.get("positionX") ?? 0),
        y: Number(formData.get("positionY") ?? 0),
      },
    });

    const [rendered] = await Promise.all([renderPromise, dbSavePromise]);
    const base64 = rendered.buffer.toString("base64");
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

    return {
      ok: true,
      image: `data:${mimeType};base64,${base64}`,
      cardId,
      verifyUrl,
    };
  } catch (error) {
    return {
      ok: false,
      image: "",
      error: error instanceof Error ? error.message : "Internal rendering error.",
    };
  }
}

export async function normalizePhotoForSegmentationAction(formData: FormData): Promise<GenerateActionResponse> {
  try {
    const photoFile = formData.get("photo") as File | null;
    if (!photoFile) {
      return { ok: false, image: "", error: "Missing photo file." };
    }
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const normalizedJpeg = await sharp(photoBuffer, { failOn: "none", animated: false })
      .rotate()
      .jpeg({ quality: 85 })
      .toBuffer();
    return {
      ok: true,
      image: `data:image/jpeg;base64,${normalizedJpeg.toString("base64")}`,
    };
  } catch (error) {
    return {
      ok: false,
      image: "",
      error: error instanceof Error ? error.message : "Photo normalization failed.",
    };
  }
}
