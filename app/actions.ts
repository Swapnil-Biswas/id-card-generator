"use server";

process.env.FONTCONFIG_PATH = process.cwd();

import { ImageRenderer } from "@/renderer/image-renderer";
import type { GeneratorMode } from "@/renderer/types";
import sharp from "sharp";

export type GenerationResponse = { ok: true; image: string; mimeType: "image/png" | "image/jpeg" } | { ok: false; error: string };

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);

export async function generateImageAction(formData: FormData): Promise<GenerationResponse> {
  try {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return { ok: false, error: "Choose a photo first." };
    if (photo.size > 15 * 1024 * 1024) return { ok: false, error: "Please use a photo smaller than 15 MB." };
    if (photo.type && !acceptedTypes.has(photo.type)) return { ok: false, error: "Use a JPG, PNG, WebP, HEIC, or AVIF photo." };
    const mode = (formData.get("mode") === "card" ? "card" : "frame") satisfies GeneratorMode;
    const format = formData.get("format") === "jpeg" ? "jpeg" : "png";
    const renderer = new ImageRenderer();
    const result = await renderer.render({
      mode,
      photo: Buffer.from(await photo.arrayBuffer()),
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? ""),
      title: String(formData.get("title") ?? ""),
      format,
      transform: { zoom: Number(formData.get("zoom") ?? 1), x: Number(formData.get("positionX") ?? 0), y: Number(formData.get("positionY") ?? 0) },
    });
    return { ok: true, image: `data:${result.contentType};base64,${result.buffer.toString("base64")}`, mimeType: result.contentType };
  } catch (error) {
    console.error("Image generation failed", error);
    return { ok: false, error: "We couldn't generate your image. Try a different photo or a smaller file." };
  }
}

export async function normalizePhotoForSegmentationAction(formData: FormData): Promise<GenerationResponse> {
  try {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return { ok: false, error: "Choose a photo first." };
    const converted = await sharp(Buffer.from(await photo.arrayBuffer()), { failOn: "none" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
    return { ok: true, image: `data:image/jpeg;base64,${converted.toString("base64")}`, mimeType: "image/jpeg" };
  } catch (error) {
    console.error("Photo normalization failed", error);
    return { ok: false, error: "We couldn't prepare that photo for background removal." };
  }
}
