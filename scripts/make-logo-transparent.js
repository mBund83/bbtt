const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const input = path.join(root, "assets", "logo-original.png");
const output = path.join(root, "assets", "logo.png");

async function main() {
  if (!fs.existsSync(input)) {
    throw new Error("Missing assets/logo-original.png");
  }

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const get = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const isDark = (x, y) => {
    const [r, g, b, a] = get(x, y);
    if (a < 10) return false;
    return (r + g + b) / 3 < 200;
  };

  let borderY = 0;
  for (let y = 0; y < height; y++) {
    if (isDark(Math.floor(width / 2), y)) {
      borderY = y;
      break;
    }
  }

  const leftEdges = [];
  for (let y = borderY; y < Math.min(borderY + Math.floor(height / 2), height); y++) {
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) {
        leftEdges.push({ x, y });
        break;
      }
    }
  }

  const flatLeft = Math.min(...leftEdges.slice(Math.floor(leftEdges.length * 0.4)).map((p) => p.x));
  const cornerPoints = leftEdges.filter((p) => p.x > flatLeft).slice(0, 30);

  let bestR = 20;
  let bestErr = Infinity;
  for (let r = 4; r < Math.min(width, height) / 2; r++) {
    let err = 0;
    const cx = flatLeft + r;
    const cy = borderY + r;
    for (const p of cornerPoints) {
      err += Math.abs(Math.hypot(p.x - cx, p.y - cy) - r);
    }
    if (cornerPoints.length && err / cornerPoints.length < bestErr) {
      bestErr = err / cornerPoints.length;
      bestR = r;
    }
  }

  let rightEdge = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    if (isDark(x, Math.floor(height / 2))) {
      rightEdge = x;
      break;
    }
  }
  let bottomEdge = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    if (isDark(Math.floor(width / 2), y)) {
      bottomEdge = y;
      break;
    }
  }

  const L = flatLeft;
  const T = borderY;
  const R = rightEdge;
  const B = bottomEdge;
  const r = bestR;

  function insideRoundedRect(x, y) {
    if (x < L || x > R || y < T || y > B) return false;
    if (x < L + r && y < T + r) return Math.hypot(x - (L + r), y - (T + r)) <= r + 0.5;
    if (x > R - r && y < T + r) return Math.hypot(x - (R - r), y - (T + r)) <= r + 0.5;
    if (x < L + r && y > B - r) return Math.hypot(x - (L + r), y - (B - r)) <= r + 0.5;
    if (x > R - r && y > B - r) return Math.hypot(x - (R - r), y - (B - r)) <= r + 0.5;
    return true;
  }

  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [rv, g, b, a] = get(x, y);
      const luminance = (rv + g + b) / 3;

      if (!insideRoundedRect(x, y)) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
        continue;
      }

      // Keep ink (text + borders); make light fill transparent
      if (luminance < 210 && a > 10) {
        // Normalize near-black ink for crisp edges
        const ink = Math.max(0, Math.min(255, Math.round((luminance / 210) * 40)));
        const alpha = Math.round(255 * (1 - luminance / 255));
        out[i] = ink;
        out[i + 1] = ink;
        out[i + 2] = ink;
        out[i + 3] = Math.max(alpha, luminance < 180 ? 255 : alpha);
        // Simpler: solid dark with alpha based on darkness
        const strength = 1 - luminance / 255;
        out[i] = 20;
        out[i + 1] = 20;
        out[i + 2] = 20;
        out[i + 3] = Math.round(255 * Math.min(1, strength * 1.35));
      } else {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim()
    .png()
    .toFile(output);

  const meta = await sharp(output).metadata();
  console.log("Wrote transparent logo", meta);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
