import { access, readFile } from "node:fs/promises";
import path from "node:path";

const assetDirectories = [path.join(process.cwd(), "assets"), path.join(process.cwd(), "public", "assets")];

export async function loadOptionalAsset(fileName: string): Promise<Buffer | undefined> {
  for (const directory of assetDirectories) {
    const candidate = path.join(directory, fileName);
    try {
      await access(candidate);
      return await readFile(candidate);
    } catch { /* Try the next asset directory. */ }
  }
  return undefined;
}

export async function loadOptionalFont(fileName?: string) {
  return fileName ? loadOptionalAsset(path.join("fonts", fileName)) : undefined;
}
