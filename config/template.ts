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
  frameCanvas?: { width: number; height: number; background: string };
  files: { frame: string; cardTemplate: string; cardOverlay?: string; logo: string; background: string; beachFrame?: string };
  photo: Box & { radius: number };
  cardPhoto?: Box & { radius: number };
  framePhoto?: Box & { radius: number };
  cardQr?: Box;
  name: TextConfig;
  role: TextConfig;
  title: TextConfig;
  logo?: Box;
}

/**
 * The configuration for Hacker House Goa ID cards and 3D Profile Frame.
 * All dimensions are based on native canvas sizes.
 */
export const TemplateConfig: TemplateDefinition = {
  canvas: { width: 1080, height: 1350, background: "#1E3D2B" },
  cardCanvas: { width: 420, height: 720, background: "#1E3D2B" },
  frameCanvas: { width: 1024, height: 683, background: "#015635" },
  files: {
    frame: "frame.png",
    cardTemplate: "card-template.svg",
    cardOverlay: "card-overlay.svg",
    logo: "logo.png",
    background: "background.png",
    beachFrame: "beac_profile_frame.jpg",
  },
  photo: { x: 140, y: 225, width: 800, height: 800, radius: 400 },
  cardPhoto: { x: 0, y: 130, width: 420, height: 590, radius: 0 },
  framePhoto: { x: 106, y: 176, width: 812, height: 400, radius: 0 },
  cardQr: { x: 315, y: 618, width: 78, height: 78 },
  name: { x: 26, y: 615, width: 280, height: 58, fontSize: 44, minFontSize: 12, color: "#1E3D2B", align: "left", fontFamily: "Archivo Black", fontWeight: 900, maxLines: 1 },
  role: { x: 26, y: 672, width: 280, height: 18, fontSize: 11, minFontSize: 8, color: "#4A3F1A", align: "left", fontFamily: "Space Mono", fontWeight: 700, maxLines: 1 },
  title: { x: 26, y: 690, width: 280, height: 16, fontSize: 10, minFontSize: 8, color: "#4A3F1A", align: "left", fontFamily: "Space Mono", fontWeight: 700, maxLines: 1 },
  logo: undefined,
};

export const ShareConfig = {
  text: "Built for HH Goa 2026 🚀\n\n#FrameInGoa",
  url: "",
};
