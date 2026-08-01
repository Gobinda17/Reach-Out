// Fulfillment sheet: one combined image of a batch of paid orders awaiting
// shipment, each cell showing its QR plus the recipient's name/address/phone
// so a packer never has to hand-match a downloaded file to the right
// envelope. This is an internal admin document, not the customer-facing tag
// card in lib/tagCard.js — printing name/address here is correct and
// intentional. (For the tag card itself in bulk, see downloadTagCardsZip in
// lib/tagCard.js.)

import QRCode from "qrcode";
import { loadImage, wrapText, downloadDataUrl } from "@/lib/tagCard";

const COLS = 3;
const CELL_WIDTH = 320;
const QR_SIZE = 160;
const PAD = 16;

async function tagQrDataUrl(code) {
  return QRCode.toDataURL(`${window.location.origin}/t/${code}`, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: QR_SIZE * 2,
  });
}

function newSheet(cellCount, cellHeight) {
  const rows = Math.max(1, Math.ceil(cellCount / COLS));
  const canvas = document.createElement("canvas");
  canvas.width = CELL_WIDTH * COLS;
  canvas.height = cellHeight * rows;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx, rows };
}

function cellOrigin(index, cellHeight) {
  return { x: (index % COLS) * CELL_WIDTH, y: Math.floor(index / COLS) * cellHeight };
}

// items: [{ code, name, phone, address }]
export async function composeFulfillmentSheet(items) {
  const cellHeight = 260;
  const { canvas, ctx } = newSheet(items.length, cellHeight);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y } = cellOrigin(i, cellHeight);

    ctx.strokeStyle = "#e2e8f0";
    ctx.strokeRect(x + 2, y + 2, CELL_WIDTH - 4, cellHeight - 4);

    const qrSize = 130;
    const qrImg = await loadImage(await tagQrDataUrl(item.code));
    ctx.drawImage(qrImg, x + PAD, y + PAD, qrSize, qrSize);

    const textX = x + PAD;
    let curY = y + PAD + qrSize + 22;
    const maxWidth = CELL_WIDTH - PAD * 2;

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px Arial, sans-serif";
    curY = wrapText(ctx, item.name || "—", textX, curY, maxWidth, 19);

    ctx.fillStyle = "#334155";
    ctx.font = "400 13px Arial, sans-serif";
    curY = wrapText(ctx, item.address || "", textX, curY + 18, maxWidth, 16);

    ctx.fillStyle = "#64748b";
    ctx.font = "400 12px Arial, sans-serif";
    ctx.fillText(item.phone || "", textX, curY + 18);

    ctx.fillStyle = "#92400e";
    ctx.font = "700 12px monospace";
    ctx.fillText(`TAG ${item.code}`, textX, curY + 36);
  }

  return canvas.toDataURL("image/png");
}

export async function downloadFulfillmentSheet(items) {
  downloadDataUrl(await composeFulfillmentSheet(items), `fulfillment-sheet-${items.length}-tags.png`);
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadFulfillmentCsv(items) {
  const header = ["Tag code", "Name", "Phone", "Address", "Product"];
  const rows = items.map((item) =>
    [item.code, item.name, item.phone, item.address, item.productName ?? item.product]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, `fulfillment-${items.length}-tags.csv`);
  URL.revokeObjectURL(url);
}
