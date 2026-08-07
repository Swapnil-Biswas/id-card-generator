if (typeof process !== "undefined") {
  process.env.FONTCONFIG_PATH = process.cwd();
  console.log("FONTCONFIG_PATH initialized to:", process.env.FONTCONFIG_PATH);
}
export {};
