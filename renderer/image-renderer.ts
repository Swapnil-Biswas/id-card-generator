import sharp, { type FitEnum, type OverlayOptions } from "sharp";
import { TemplateConfig, type Box } from "@/config/template";
import { loadOptionalAsset, loadOptionalFont } from "@/lib/assets";
import { textSvg } from "@/renderer/text";
import type { RenderInput, RenderResult } from "@/renderer/types";

const transparentPixel = { r: 0, g: 0, b: 0, alpha: 0 };

function roundedMask(box: Box & { radius: number }) {
  return Buffer.from(`<svg width="${box.width}" height="${box.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${box.radius}" ry="${box.radius}" fill="#fff"/></svg>`);
}

async function resizeAsset(asset: Buffer | undefined, width: number, height: number, fit: keyof FitEnum = "fill") {
  return asset ? sharp(asset, { animated: false }).resize(width, height, { fit }).png().toBuffer() : undefined;
}

async function preparePhoto(photo: Buffer, box: Box & { radius: number }, transform?: RenderInput["transform"]) {
  const normalized = sharp(photo, { failOn: "none", animated: false }).rotate();
  const metadata = await normalized.metadata();
  if (!metadata.width || !metadata.height) throw new Error("We couldn't read that image. Please try another photo.");
  const zoom = Math.min(3, Math.max(1, transform?.zoom ?? 1));
  const hasManualPosition = zoom > 1.01 || Math.abs(transform?.x ?? 0) > 0.01 || Math.abs(transform?.y ?? 0) > 0.01;
  let result: Buffer;

  if (!hasManualPosition) {
    result = await normalized.resize(box.width, box.height, { fit: "cover", position: "attention", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  } else {
    const scale = Math.max(box.width / metadata.width, box.height / metadata.height) * zoom;
    const scaledWidth = Math.max(box.width, Math.ceil(metadata.width * scale));
    const scaledHeight = Math.max(box.height, Math.ceil(metadata.height * scale));
    const positioned = await normalized.resize(scaledWidth, scaledHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const horizontal = Math.min(1, Math.max(0, 0.5 + (transform?.x ?? 0) / 2));
    const vertical = Math.min(1, Math.max(0, 0.5 + (transform?.y ?? 0) / 2));
    result = await sharp(positioned).extract({ left: Math.round((scaledWidth - box.width) * horizontal), top: Math.round((scaledHeight - box.height) * vertical), width: box.width, height: box.height }).png().toBuffer();
  }
  return sharp(result).composite([{ input: roundedMask(box), blend: "dest-in" }]).png().toBuffer();
}

/** Composites a user photo, configurable assets, and configurable SVG typography. */
export class ImageRenderer {
  async render(input: RenderInput): Promise<RenderResult> {
    const config = TemplateConfig;
    const canvas = input.mode === "card" ? (config.cardCanvas ?? config.canvas) : config.canvas;
    const photoBox = input.mode === "card" ? (config.cardPhoto ?? config.photo) : config.photo;
    const { width, height, background } = canvas;
    const [frame, cardTemplate, cardOverlay, logo, backgroundAsset, font] = await Promise.all([
      loadOptionalAsset(config.files.frame),
      loadOptionalAsset(config.files.cardTemplate),
      loadOptionalAsset(config.files.cardOverlay ?? ""),
      loadOptionalAsset(config.files.logo),
      loadOptionalAsset(config.files.background),
      loadOptionalFont(config.name.fontFile),
    ]);
    const photo = await preparePhoto(input.photo, photoBox, input.transform);
    const template = input.mode === "card" ? cardTemplate : backgroundAsset;
    const layers: OverlayOptions[] = [];
    const preparedTemplate = await resizeAsset(template, width, height);
    if (preparedTemplate) layers.push({ input: preparedTemplate });
    layers.push({ input: photo, left: photoBox.x, top: photoBox.y });

    if (input.mode === "card") {
      const preparedOverlay = await resizeAsset(cardOverlay, width, height);
      if (preparedOverlay) layers.push({ input: preparedOverlay });
      for (const { value, textConfig } of [{ value: input.name, textConfig: config.name }, { value: input.role, textConfig: config.role }, { value: input.title, textConfig: config.title }]) {
        const svg = textSvg(value, textConfig, font);
        if (svg) layers.push({ input: Buffer.from(svg), top: textConfig.y, left: textConfig.x });
      }
      if (logo && config.logo) layers.push({ input: await resizeAsset(logo, config.logo.width, config.logo.height) as Buffer, left: config.logo.x, top: config.logo.y });
    }
    if (input.mode === "frame") {
      const preparedFrame = await resizeAsset(frame, width, height);
      if (preparedFrame) layers.push({ input: preparedFrame });
    }

    let output = sharp({ create: { width, height, channels: 4, background: input.mode === "frame" ? transparentPixel : background } }).composite(layers);
    if (input.format === "jpeg") output = output.flatten({ background: background }).jpeg({ quality: 94, chromaSubsampling: "4:4:4", mozjpeg: true });
    else output = output.png({ compressionLevel: 8, adaptiveFiltering: true });
    return { buffer: await output.toBuffer(), contentType: input.format === "jpeg" ? "image/jpeg" : "image/png", fileExtension: input.format === "jpeg" ? "jpg" : "png" };
  }
}
