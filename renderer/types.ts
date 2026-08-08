export type GeneratorMode = "frame" | "card";

export interface PhotoTransform {
  zoom?: number;
  x?: number;
  y?: number;
  positionX?: number;
  positionY?: number;
  removeBackground?: boolean;
}

export interface RenderInput {
  mode: GeneratorMode;
  photo: Buffer;
  name?: string;
  role?: string;
  title?: string;
  transform?: PhotoTransform;
  format?: "png" | "jpeg";
  qrUrl?: string;
}

export interface RenderResult {
  buffer: Buffer;
  contentType: "image/png" | "image/jpeg";
  fileExtension: "png" | "jpg";
}
