// Generate the app logo (dawn mark) for the Google OAuth consent screen.
// Run: node scripts/gen-logo.mjs
import sharp from "sharp";

const OUT = "C:/Users/vup/OneDrive/Desktop/C_AI/導航日上架手冊";

// Square, paper background, centred clay dawn mark. Works whether Google shows
// it as a square or crops to a circle (content stays well inside the safe area).
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f4efe4"/>
  <g fill="none" stroke="#9a5f38" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 336 a106 106 0 0 1 212 0"/>
    <line x1="116" y1="336" x2="396" y2="336"/>
    <line x1="256" y1="158" x2="256" y2="200"/>
    <line x1="172" y1="184" x2="200" y2="212"/>
    <line x1="340" y1="184" x2="312" y2="212"/>
  </g>
</svg>`;
const buf = Buffer.from(svg);

for (const size of [120, 512]) {
  const file = `${OUT}/導航日-logo-${size}.png`;
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
console.log("done");
