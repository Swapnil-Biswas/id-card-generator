import fs from "node:fs";
import path from "node:path";

if (typeof process !== "undefined") {
  const possiblePaths = [
    process.cwd(),
    path.join(process.cwd(), ".next", "server"),
    "/var/task"
  ];
  let foundPath = process.cwd();
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "fonts.conf"))) {
      foundPath = p;
      break;
    }
  }
  process.env.FONTCONFIG_PATH = foundPath;
  console.log("FONTCONFIG_PATH initialized to:", process.env.FONTCONFIG_PATH);
}
export {};
