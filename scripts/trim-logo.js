const sharp = require("sharp");
const path = require("path");

const root = path.join(__dirname, "..");
const input = path.join(root, "assets", "logo-original.png");
const output = path.join(root, "assets", "logo.png");

async function main() {
  const image = sharp(input);
  const meta = await image.metadata();
  const { width, height } = meta;
  console.log({ width, height, channels: meta.channels });

  // Sample a few pixels to understand padding / corner radius
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const get = (x, y) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  // Find first non-white pixel from top-left along diagonal-ish scan
  let borderY = 0;
  for (let y = 0; y < height; y++) {
    const [r, g, b] = get(Math.floor(width / 2), y);
    if (r < 250 || g < 250 || b < 250) {
      borderY = y;
      break;
    }
  }

  let borderX = 0;
  for (let x = 0; x < width; x++) {
    const [r, g, b] = get(x, Math.floor(height / 2));
    if (r < 250 || g < 250 || b < 250) {
      borderX = x;
      break;
    }
  }

  console.log({ borderX, borderY, sampleTL: get(0, 0), sampleMid: get(Math.floor(width / 2), Math.floor(height / 2)) });

  // Estimate corner radius: walk from top edge inward at left side
  // Find where the outer border curve starts (first dark pixel on top row of content)
  // Better: for each y from borderY, find leftmost dark pixel
  const leftEdges = [];
  for (let y = borderY; y < Math.min(borderY + Math.floor(height / 2), height); y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = get(x, y);
      if (r < 240 || g < 240 || b < 240) {
        leftEdges.push({ x, y });
        break;
      }
    }
  }

  // Radius approx: difference from flat left edge
  const flatLeft = Math.min(...leftEdges.slice(Math.floor(leftEdges.length * 0.4)).map((p) => p.x));
  let radius = 0;
  for (const p of leftEdges) {
    if (p.x > flatLeft + 1) {
      radius = Math.max(radius, p.x - flatLeft);
    } else {
      break;
    }
  }

  // Also measure from first few points
  if (leftEdges.length > 0) {
    const startX = leftEdges[0].x;
    radius = Math.max(radius, startX - flatLeft);
  }

  console.log({ flatLeft, radius, firstEdges: leftEdges.slice(0, 8) });

  // Padding around the rounded rect
  const padX = flatLeft;
  const padY = borderY;
  // Inner rounded rect that contains the logo artwork (including border)
  // The outer border is at padX/padY; corners are rounded with `radius`
  // Make everything OUTSIDE that rounded rect transparent.

  // Use a slightly larger effective radius based on measured curve
  // Recalculate radius more carefully from corner pixels
  let measuredR = 0;
  for (let i = 0; i < Math.min(80, leftEdges.length); i++) {
    const dx = leftEdges[i].x - flatLeft;
    const dy = leftEdges[i].y - borderY;
    if (dx > 0) {
      // For a circle quarter: (r-dx)^2 + (r-dy)^2 ~= r^2 => r ~= (dx^2 + dy^2) / (2*(dx or depending))
      // Actually for rounded rect outer edge: point is on arc centered at (flatLeft+r, borderY+r)
      // distance from center should be r
      // We can solve for r given points
    }
  }

  // Fit radius: center at (flatLeft + r, borderY + r), points on border should be distance r
  // Use first dark pixel on top-left as on the arc
  const cornerPoints = leftEdges.filter((p) => p.x > flatLeft).slice(0, 30);
  let bestR = radius || 20;
  let bestErr = Infinity;
  for (let r = 4; r < Math.min(width, height) / 2; r++) {
    let err = 0;
    const cx = flatLeft + r;
    const cy = borderY + r;
    for (const p of cornerPoints) {
      const dist = Math.hypot(p.x - cx, p.y - cy);
      err += Math.abs(dist - r);
    }
    if (cornerPoints.length && err / cornerPoints.length < bestErr) {
      bestErr = err / cornerPoints.length;
      bestR = r;
    }
  }
  console.log({ bestR, bestErr });

  const r = bestR;
  const left = flatLeft;
  const top = borderY;
  const right = width - flatLeft - 1;
  const bottom = height - borderY - 1;

  // Find right/bottom similarly
  let rightEdge = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    const [rv, g, b] = get(x, Math.floor(height / 2));
    if (rv < 250 || g < 250 || b < 250) {
      rightEdge = x;
      break;
    }
  }
  let bottomEdge = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    const [rv, g, b] = get(Math.floor(width / 2), y);
    if (rv < 250 || g < 250 || b < 250) {
      bottomEdge = y;
      break;
    }
  }
  console.log({ rightEdge, bottomEdge });

  const L = left;
  const T = top;
  const R = rightEdge;
  const B = bottomEdge;

  function insideRoundedRect(x, y) {
    // Interior of rounded rect including border stroke (filled shape of the outer silhouette)
    if (x < L || x > R || y < T || y > B) return false;
    // Corner centers
    const corners = [
      [L + r, T + r],
      [R - r, T + r],
      [L + r, B - r],
      [R - r, B - r],
    ];
    // If in corner zones
    if (x < L + r && y < T + r) {
      return Math.hypot(x - corners[0][0], y - corners[0][1]) <= r + 0.5;
    }
    if (x > R - r && y < T + r) {
      return Math.hypot(x - corners[1][0], y - corners[1][1]) <= r + 0.5;
    }
    if (x < L + r && y > B - r) {
      return Math.hypot(x - corners[2][0], y - corners[2][1]) <= r + 0.5;
    }
    if (x > R - r && y > B - r) {
      return Math.hypot(x - corners[3][0], y - corners[3][1]) <= r + 0.5;
    }
    return true;
  }

  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!insideRoundedRect(x, y)) {
        const i = (y * width + x) * 4;
        out[i + 3] = 0;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);

  console.log("Wrote", output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
