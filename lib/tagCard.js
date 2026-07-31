// Composes a printable "tag card" PNG in the browser: a white/yellow split
// card (wordmark + headline on the left, QR on a white tile on the right),
// matching the site's sticker-mockup design. Used for both the on-screen
// preview and the downloaded file, so what you see is what you print.

const CARD_WIDTH = 880;
const CARD_HEIGHT = 550;
const LEFT_WIDTH = Math.round(CARD_WIDTH * 0.58);
const PAD = 48;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws left-aligned wrapped text and returns the y of the last baseline drawn.
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
  return curY;
}

export async function composeTagCard({ qrDataUrl, code }) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  // Panels
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(LEFT_WIDTH, 0, CARD_WIDTH - LEFT_WIDTH, CARD_HEIGHT);

  // Wordmark
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText("Reach", PAD, 72);
  const reachWidth = ctx.measureText("Reach").width;
  ctx.fillStyle = "#eab308";
  ctx.fillText("-Out", PAD + reachWidth, 72);

  // Headline — deliberately generic. The owner's name is never printed on
  // the tag, matching the "no personal details shown" promise everywhere else.
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 38px Arial, sans-serif";
  const headline = "Scan the code to reach the owner.";
  const headlineEndY = wrapText(ctx, headline, PAD, 150, LEFT_WIDTH - PAD * 2, 46);

  // Subtext
  ctx.fillStyle = "#64748b";
  ctx.font = "400 19px Arial, sans-serif";
  wrapText(
    ctx,
    "Scan with your phone camera, Google Lens, or any QR app — no install needed.",
    PAD,
    headlineEndY + 48,
    LEFT_WIDTH - PAD * 2,
    27
  );

  // Tag code chip
  ctx.font = "700 17px monospace";
  const codeText = `TAG ${code}`;
  const codeWidth = ctx.measureText(codeText).width;
  const chipHeight = 40;
  const chipY = CARD_HEIGHT - chipHeight - PAD + 8;
  ctx.fillStyle = "#fef9c3";
  roundRectPath(ctx, PAD, chipY, codeWidth + 28, chipHeight, 8);
  ctx.fill();
  ctx.fillStyle = "#854d0e";
  ctx.fillText(codeText, PAD + 14, chipY + 26);

  // QR tile
  const qrImg = await loadImage(qrDataUrl);
  const rightPanelWidth = CARD_WIDTH - LEFT_WIDTH;
  const tileSize = Math.min(rightPanelWidth, CARD_HEIGHT) - PAD * 1.3;
  const tileX = LEFT_WIDTH + (rightPanelWidth - tileSize) / 2;
  const tileY = (CARD_HEIGHT - tileSize) / 2 - 18;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, tileX, tileY, tileSize, tileSize, 16);
  ctx.fill();
  const qrInset = 16;
  ctx.drawImage(qrImg, tileX + qrInset, tileY + qrInset, tileSize - qrInset * 2, tileSize - qrInset * 2);

  // Private badge
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PRIVATE", LEFT_WIDTH + rightPanelWidth / 2, tileY + tileSize + 38);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export const TAG_CARD_ASPECT = `${CARD_WIDTH}/${CARD_HEIGHT}`;
