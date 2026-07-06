// Rasterize the dawn mark into the PNG icons the app + PWA manifest need.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f4efe4"/>
  <g fill="none" stroke="#9a5f38" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 330 a106 106 0 0 1 212 0"/>
    <line x1="118" y1="330" x2="394" y2="330"/>
    <line x1="256" y1="148" x2="256" y2="190"/>
    <line x1="174" y1="174" x2="200" y2="200"/>
    <line x1="338" y1="174" x2="312" y2="200"/>
  </g>
</svg>`;
const buf = Buffer.from(svg);

mkdirSync("public", { recursive: true });
mkdirSync("src/app", { recursive: true });

const targets = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["src/app/icon.png", 64],
  ["src/app/apple-icon.png", 180],
];

for (const [file, size] of targets) {
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log("wrote", file, size);
}
console.log("done");
