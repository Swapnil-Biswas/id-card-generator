export type TextAlign = "left" | "center" | "right";

export interface Box { x: number; y: number; width: number; height: number }
export interface TextConfig extends Box {
  fontSize: number;
  minFontSize: number;
  color: string;
  align: TextAlign;
  fontFamily: string;
  fontFile?: string;
  lineHeight?: number;
  maxLines?: number;
  fontWeight?: number;
}

export interface TemplateDefinition {
  canvas: { width: number; height: number; background: string };
  cardCanvas?: { width: number; height: number; background: string };
  files: { frame: string; cardTemplate: string; cardOverlay?: string; logo: string; background: string };
  photo: Box & { radius: number };
  cardPhoto?: Box & { radius: number };
  name: TextConfig;
  role: TextConfig;
  title: TextConfig;
  logo?: Box;
}

/**
 * The only configuration that needs changing when final brand assets arrive.
 * All dimensions are based on the template's native canvas size.
 */
export const TemplateConfig: TemplateDefinition = {
  canvas: { width: 1080, height: 1350, background: "#F8F7F2" },
  cardCanvas: { width: 420, height: 720, background: "#1E3D2B" },
  files: {
    frame: "frame.png",
    cardTemplate: "card-template.svg",
    cardOverlay: "card-overlay.svg",
    logo: "logo.png",
    background: "background.png",
  },
  photo: { x: 140, y: 225, width: 800, height: 800, radius: 400 },
  cardPhoto: { x: 40, y: 258, width: 340, height: 395, radius: 0 },
  name: { x: 26, y: 590, width: 368, height: 58, fontSize: 52, minFontSize: 25, color: "#1E3D2B", align: "left", fontFamily: "Arial Black", fontWeight: 900, maxLines: 1 },
  role: { x: 27, y: 654, width: 366, height: 20, fontSize: 11, minFontSize: 8, color: "#4A3F1A", align: "left", fontFamily: "Courier New", fontWeight: 700, maxLines: 1 },
  title: { x: 27, y: 677, width: 366, height: 18, fontSize: 10, minFontSize: 8, color: "#4A3F1A", align: "left", fontFamily: "Courier New", fontWeight: 700, maxLines: 1 },
  logo: undefined,
};

export const ShareConfig = {
  text: "Built for HH Goa 2026 🚀\n\n#FrameInGoa",
  url: "",
};
