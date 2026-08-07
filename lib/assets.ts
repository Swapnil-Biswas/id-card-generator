import { access, readFile } from "node:fs/promises";
import path from "node:path";

const assetDirectories = [path.join(process.cwd(), "assets"), path.join(process.cwd(), "public", "assets")];
const assetCache = new Map<string, Buffer>();

export async function loadOptionalAsset(fileName: string): Promise<Buffer | undefined> {
  if (!fileName) return undefined;
  
  if (process.env.NODE_ENV === "production" && assetCache.has(fileName)) {
    return assetCache.get(fileName);
  }

  for (const directory of assetDirectories) {
    const candidate = path.join(directory, fileName);
    try {
      await access(candidate);
      const buffer = await readFile(candidate);
      assetCache.set(fileName, buffer);
      return buffer;
    } catch {
      /* Try the next asset directory. */
    }
  }
  return undefined;
}

export async function loadOptionalFont(fileName?: string) {
  return fileName ? loadOptionalAsset(path.join("fonts", fileName)) : undefined;
}
