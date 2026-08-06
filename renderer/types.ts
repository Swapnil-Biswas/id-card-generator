export type GeneratorMode = "frame" | "card";

export interface PhotoTransform { zoom: number; x: number; y: number }

export interface RenderInput {
  mode: GeneratorMode;
  photo: Buffer;
  name?: string;
  role?: string;
  title?: string;
  transform?: PhotoTransform;
  format?: "png" | "jpeg";
}

export interface RenderResult { buffer: Buffer; contentType: "image/png" | "image/jpeg"; fileExtension: "png" | "jpg" }
