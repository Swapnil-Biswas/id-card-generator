import "../app/init-fontconfig";
import QRCode from "qrcode";
import sharp, { type FitEnum, type OverlayOptions } from "sharp";
import { TemplateConfig, type Box } from "@/config/template";
import { loadOptionalAsset, loadOptionalFont } from "@/lib/assets";
import { textSvg } from "@/renderer/text";
import type { RenderInput, RenderResult } from "@/renderer/types";

const transparentPixel = { r: 0, g: 0, b: 0, alpha: 0 };

function roundedMask(box: Box & { radius: number }) {
  return Buffer.from(`<svg width="${box.width}" height="${box.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${box.radius}" ry="${box.radius}" fill="#fff"/></svg>`);
}

async function prepareQrBuffer(url: string, box: Box): Promise<Buffer> {
  const padding = Math.max(4, Math.round(box.width * 0.05));
  const qrSize = box.width - padding * 2;
  const strokeWidth = Math.max(2, Math.round(box.width * 0.025));
  const rx = Math.max(8, Math.round(box.width * 0.1));

  let qrPng: Buffer;
  try {
    qrPng = await QRCode.toBuffer(url, {
      type: "png",
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#062C1B", light: "#FFFFFF" },
    });
  } catch {
    qrPng = await QRCode.toBuffer(url, {
      type: "png",
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: "L",
      color: { dark: "#062C1B", light: "#FFFFFF" },
    });
  }
  const containerSvg = `<svg width="${box.width}" height="${box.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" rx="${rx}" fill="#FFFFFF" stroke="#062C1B" stroke-width="${strokeWidth}"/>
  </svg>`;
  return sharp(Buffer.from(containerSvg))
    .composite([{ input: qrPng, top: padding, left: padding }])
    .png({ compressionLevel: 1 })
    .toBuffer();
}

async function resizeAsset(asset: Buffer | undefined, width: number, height: number, fit: keyof FitEnum = "fill") {
  return asset ? sharp(asset, { animated: false }).resize(width, height, { fit, kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 1 }).toBuffer() : undefined;
}

function topFadeMask(width: number, height: number, fadeHeight: number) {
  const fadePercent = Math.min(100, Math.max(0, (fadeHeight / height) * 100));
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="${fadePercent}%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)"/>
    </svg>`
  );
}

async function preparePhoto(photo: Buffer, box: Box & { radius: number }, transform?: RenderInput["transform"], applyTopFade = false, fadeHeight = 130) {
  const normalized = sharp(photo, { failOn: "none", animated: false }).rotate();
  const metadata = await normalized.metadata();
  if (!metadata.width || !metadata.height) throw new Error("We couldn't read that image. Please try another photo.");
  
  let width = metadata.width;
  let height = metadata.height;
  if (metadata.orientation && metadata.orientation >= 5) {
    width = metadata.height;
    height = metadata.width;
  }

  const zoom = Math.min(3, Math.max(0.3, transform?.zoom ?? 1));
  const hasManualPosition = Math.abs(zoom - 1) > 0.01 || Math.abs(transform?.x ?? 0) > 0.01 || Math.abs(transform?.y ?? 0) > 0.01;
  let result: Buffer;

  if (!hasManualPosition) {
    result = await normalized.resize(box.width, box.height, { fit: "cover", position: "center", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 1 }).toBuffer();
  } else {
    const scale = Math.max(box.width / width, box.height / height) * zoom;
    const scaledWidth = Math.ceil(width * scale);
    const scaledHeight = Math.ceil(height * scale);
    const positioned = await normalized.resize(scaledWidth, scaledHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 1 }).toBuffer();
    const transformX = transform?.x ?? 0;
    const transformY = transform?.y ?? 0;

    const maxDeltaX = Math.abs(box.width - scaledWidth) / 2;
    const maxDeltaY = Math.abs(box.height - scaledHeight) / 2;
    const shiftX = (box.width - scaledWidth) / 2 + maxDeltaX * transformX;
    const shiftY = (box.height - scaledHeight) / 2 + maxDeltaY * transformY;

    const srcLeft = Math.max(0, -shiftX);
    const srcTop = Math.max(0, -shiftY);
    const cropWidth = Math.min(scaledWidth - srcLeft, box.width - Math.max(0, shiftX));
    const cropHeight = Math.min(scaledHeight - srcTop, box.height - Math.max(0, shiftY));

    const cropped = await sharp(positioned)
      .extract({
        left: Math.round(srcLeft),
        top: Math.round(srcTop),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
      })
      .toBuffer();

    const compositeLeft = Math.max(0, shiftX);
    const compositeTop = Math.max(0, shiftY);

    result = await sharp({
      create: {
        width: box.width,
        height: box.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: cropped, left: Math.round(compositeLeft), top: Math.round(compositeTop) }])
    .png({ compressionLevel: 1 })
    .toBuffer();
  }

  const overlays: OverlayOptions[] = [];
  if (applyTopFade) {
    overlays.push({ input: topFadeMask(box.width, box.height, fadeHeight), blend: "dest-in" });
  }
  if (box.radius > 0) {
    overlays.push({ input: roundedMask(box), blend: "dest-in" });
  }

  if (overlays.length > 0) {
    return sharp(result).composite(overlays).png({ compressionLevel: 1 }).toBuffer();
  }
  return result;
}

/** Composites a user photo, configurable assets, and configurable SVG typography. */
export class ImageRenderer {
  async render(input: RenderInput): Promise<RenderResult> {
    const config = TemplateConfig;
    const rawCanvas = input.mode === "card" ? (config.cardCanvas ?? config.canvas) : config.canvas;
    const rawPhotoBox = input.mode === "card" ? (config.cardPhoto ?? config.photo) : config.photo;

    // Render cards at 2.5x High-DPI resolution for razor-sharp HD clarity
    const SCALE = input.mode === "card" ? 2.5 : 1;

    const width = Math.round(rawCanvas.width * SCALE);
    const height = Math.round(rawCanvas.height * SCALE);
    const background = rawCanvas.background;

    const photoBox = {
      x: Math.round(rawPhotoBox.x * SCALE),
      y: Math.round(rawPhotoBox.y * SCALE),
      width: Math.round(rawPhotoBox.width * SCALE),
      height: Math.round(rawPhotoBox.height * SCALE),
      radius: Math.round(rawPhotoBox.radius * SCALE),
    };

    const fadeHeight = Math.round(130 * SCALE);

    const [frame, cardTemplate, cardOverlay, logo, backgroundAsset, font] = await Promise.all([
      loadOptionalAsset(config.files.frame),
      loadOptionalAsset(config.files.cardTemplate),
      loadOptionalAsset(config.files.cardOverlay ?? ""),
      loadOptionalAsset(config.files.logo),
      loadOptionalAsset(config.files.background),
      loadOptionalFont(config.name.fontFile),
    ]);

    const [photo, preparedTemplate, preparedOverlay] = await Promise.all([
      preparePhoto(input.photo, photoBox, input.transform, input.mode === "card", fadeHeight),
      resizeAsset(input.mode === "card" ? cardTemplate : backgroundAsset, width, height),
      input.mode === "card" ? resizeAsset(cardOverlay, width, height) : Promise.resolve(undefined),
    ]);

    const layers: OverlayOptions[] = [];
    if (preparedTemplate) layers.push({ input: preparedTemplate });
    layers.push({ input: photo, left: photoBox.x, top: photoBox.y });

    if (input.mode === "card") {
      if (preparedOverlay) layers.push({ input: preparedOverlay });
      for (const { value, textConfig } of [
        { value: input.name, textConfig: config.name },
        { value: input.role, textConfig: config.role },
        { value: input.title, textConfig: config.title }
      ]) {
        const scaledTextConfig = {
          ...textConfig,
          x: Math.round(textConfig.x * SCALE),
          y: Math.round(textConfig.y * SCALE),
          width: Math.round(textConfig.width * SCALE),
          height: Math.round(textConfig.height * SCALE),
          fontSize: Math.round(textConfig.fontSize * SCALE),
          minFontSize: Math.round(textConfig.minFontSize * SCALE),
        };
        const svg = textSvg(value, scaledTextConfig, font);
        if (svg) layers.push({ input: Buffer.from(svg), top: scaledTextConfig.y, left: scaledTextConfig.x });
      }
      if (input.qrUrl && config.cardQr) {
        const scaledQrBox = {
          x: Math.round(config.cardQr.x * SCALE),
          y: Math.round(config.cardQr.y * SCALE),
          width: Math.round(config.cardQr.width * SCALE),
          height: Math.round(config.cardQr.height * SCALE),
        };
        const qrBuffer = await prepareQrBuffer(input.qrUrl, scaledQrBox);
        layers.push({ input: qrBuffer, left: scaledQrBox.x, top: scaledQrBox.y });
      }
      if (logo && config.logo) {
        const scaledLogoBox = {
          x: Math.round(config.logo.x * SCALE),
          y: Math.round(config.logo.y * SCALE),
          width: Math.round(config.logo.width * SCALE),
          height: Math.round(config.logo.height * SCALE),
        };
        layers.push({ input: await resizeAsset(logo, scaledLogoBox.width, scaledLogoBox.height) as Buffer, left: scaledLogoBox.x, top: scaledLogoBox.y });
      }
    }
    if (input.mode === "frame") {
      const preparedFrame = await resizeAsset(frame, width, height);
      if (preparedFrame) layers.push({ input: preparedFrame });
    }

    let output = sharp({ create: { width, height, channels: 4, background: input.mode === "frame" ? transparentPixel : background } }).composite(layers);
    if (input.format === "jpeg") output = output.flatten({ background: background }).jpeg({ quality: 98, chromaSubsampling: "4:4:4" });
    else output = output.png({ compressionLevel: 1 });
    return { buffer: await output.toBuffer(), contentType: input.format === "jpeg" ? "image/jpeg" : "image/png", fileExtension: input.format === "jpeg" ? "jpg" : "png" };
  }
}
