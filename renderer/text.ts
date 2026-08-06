import type { TextConfig } from "@/config/template";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);

function ellipsize(value: string, limit: number) { return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`; }

function linesFor(value: string, config: TextConfig, fontSize: number) {
  const averageCharacterWidth = fontSize * 0.58;
  const charactersPerLine = Math.max(1, Math.floor(config.width / averageCharacterWidth));
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= charactersPerLine || !current) current = next;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  const maxLines = config.maxLines ?? 1;
  const constrained = lines.length > maxLines ? [...lines.slice(0, maxLines - 1), ellipsize(lines.slice(maxLines - 1).join(" "), charactersPerLine)] : lines;
  return constrained.map((line) => ellipsize(line, charactersPerLine));
}

export function textSvg(value: string | undefined, config: TextConfig, fontData?: Buffer) {
  if (!value?.trim()) return "";
  const maxLines = config.maxLines ?? 1;
  let fontSize = config.fontSize;
  let lines = linesFor(value, config, fontSize);
  while ((lines.length > maxLines || lines.some((line) => line.length * fontSize * 0.58 > config.width)) && fontSize > config.minFontSize) {
    fontSize -= 1;
    lines = linesFor(value, config, fontSize);
  }
  const lineHeight = config.lineHeight ?? Math.round(fontSize * 1.18);
  const usedHeight = lines.length * lineHeight;
  const firstBaseline = Math.max(fontSize, (config.height - usedHeight) / 2 + fontSize);
  const anchor = config.align === "left" ? "start" : config.align === "right" ? "end" : "middle";
  const x = config.align === "left" ? 0 : config.align === "right" ? config.width : config.width / 2;
  const face = fontData && config.fontFile ? `@font-face{font-family:custom;src:url(data:font/ttf;base64,${fontData.toString("base64")})}` : "";
  const family = fontData ? "custom" : config.fontFamily;
  const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
  return `<svg width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg"><style>${face}</style><text x="${x}" y="${firstBaseline}" text-anchor="${anchor}" fill="${config.color}" font-family="${family}" font-size="${fontSize}" font-weight="${config.fontWeight ?? 400}">${tspans}</text></svg>`;
}
