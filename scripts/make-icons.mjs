// Builds a branch's logo + app icons from one source image.
//
//   npm run icons -- <source-image> <branch: pos1|pos2>
//
// pos1 → public/            (Matthew Sports)
// pos2 → public/pos2/       (Vybe Girl)
//
// The logo is centred on a square background matching the logo's own
// backdrop, so wide logos still make clean square icons.
import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const BRANCHES = {
  pos1: { dir: "public", background: "#030408" }, // Matthew Sports logo sits on black
  pos2: { dir: "public/pos2", background: "#FCF3EA" }, // Vybe Girl badge sits on cream
};

const [src, branchId] = process.argv.slice(2);
const branch = BRANCHES[branchId];
if (!src || !branch) {
  console.error("Usage: npm run icons -- <source-image> <pos1|pos2>");
  process.exit(1);
}

await mkdir(branch.dir, { recursive: true });

// The logo itself, shown in the terminal and on invoices.
const logoOut = path.join(branch.dir, "logo.png");
if (path.extname(src).toLowerCase() === ".png") await copyFile(src, logoOut);
else await sharp(src).png().toFile(logoOut);

// size: output px, pad: fraction of the canvas kept clear around the logo
const icons = [
  { file: "icon-192.png", size: 192, pad: 0.08 },
  { file: "icon-512.png", size: 512, pad: 0.08 },
  { file: "icon-maskable-512.png", size: 512, pad: 0.2 }, // Android crops to a circle
  { file: "apple-icon.png", size: 180, pad: 0.1 },
];

for (const { file, size, pad } of icons) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: branch.background })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: branch.background },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(branch.dir, file));
  console.log("wrote", path.join(branch.dir, file));
}
console.log("wrote", logoOut);
