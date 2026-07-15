import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public");
const SOURCE_ICON = resolve(PUBLIC_DIR, "favicon-v2.svg");

const targets = [
  { file: "apple-touch-icon-v2.png", size: 180 },
  { file: "pwa-192x192-v2.png", size: 192 },
  { file: "pwa-512x512-v2.png", size: 512 },
  { file: "maskable-512x512-v2.png", size: 512 },
];

const svgBuffer = await readFile(SOURCE_ICON);

await Promise.all(
  targets.map(({ file, size }) =>
    sharp(svgBuffer, { density: size >= 512 ? 384 : 144 })
      .resize(size, size)
      .png()
      .toFile(resolve(PUBLIC_DIR, file)),
  ),
);

console.log(`Generated PWA icons: ${targets.map(target => target.file).join(", ")}`);
