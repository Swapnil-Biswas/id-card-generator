import type { TextConfig } from "@/config/template";

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);

/** Calculates character width multiplier based on font family */
function getCharWidthRatio(fontFamily: string, fontWeight?: number): number {
  const family = fontFamily.toLowerCase();
  if (family.includes("impact")) return 0.50;
  if (family.includes("black") || (fontWeight && fontWeight >= 800)) return 0.62;
  if (family.includes("courier") || family.includes("mono")) return 0.58;
  return 0.56;
}

export function textSvg(value: string | undefined, config: TextConfig, fontData?: Buffer) {
  if (!value?.trim()) return "";
  const rawText = value.trim();
  const charRatio = getCharWidthRatio(config.fontFamily, config.fontWeight);
  
  let fontSize = config.fontSize;
  const minFontSize = config.minFontSize ?? 10;
  const maxLines = config.maxLines ?? 1;

  const fontStack = fontData
    ? "custom"
    : `${config.fontFamily}, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

  const face = fontData && config.fontFile
    ? `@font-face{font-family:custom;src:url(data:font/ttf;base64,${fontData.toString("base64")})}`
    : "";

  if (maxLines === 1) {
    // Single line mode: shrink font size until the ENTIRE text fits inside config.width
    while (rawText.length * fontSize * charRatio > config.width && fontSize > minFontSize) {
      fontSize -= 1;
    }
    const anchor = config.align === "left" ? "start" : config.align === "right" ? "end" : "middle";
    const x = config.align === "left" ? 0 : config.align === "right" ? config.width : config.width / 2;

    return `<svg width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg">
      <style>${face}</style>
      <text x="${x}" y="50%" dominant-baseline="central" text-anchor="${anchor}" fill="${config.color}" font-family="${fontStack}" font-size="${fontSize}" font-weight="${config.fontWeight ?? 800}">
        ${escapeXml(rawText)}
      </text>
    </svg>`;
  }

  // Multi-line mode: shrink font size if text line length exceeds width
  const words = rawText.split(/\s+/);
  let lines: string[] = [];
  
  const computeLines = (size: number) => {
    const charsPerLine = Math.max(1, Math.floor(config.width / (size * charRatio)));
    const result: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= charsPerLine || !current) current = next;
      else { result.push(current); current = word; }
    }
    if (current) result.push(current);
    return result;
  };

  lines = computeLines(fontSize);
  while ((lines.length > maxLines || lines.some((line) => line.length * fontSize * charRatio > config.width)) && fontSize > minFontSize) {
    fontSize -= 1;
    lines = computeLines(fontSize);
  }

  const lineHeight = config.lineHeight ?? Math.round(fontSize * 1.18);
  const anchor = config.align === "left" ? "start" : config.align === "right" ? "end" : "middle";
  const x = config.align === "left" ? 0 : config.align === "right" ? config.width : config.width / 2;
  const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");

  return `<svg width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg">
    <style>${face}</style>
    <text x="${x}" y="${fontSize}" text-anchor="${anchor}" fill="${config.color}" font-family="${fontStack}" font-size="${fontSize}" font-weight="${config.fontWeight ?? 800}">${tspans}</text>
  </svg>`;
}
