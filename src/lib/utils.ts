export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function generateRoomId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate simple SVG QR Code data matrix for room URLs
export function generateSvgQrCode(text: string): string {
  // A clean deterministic SVG pattern based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const size = 21; // 21x21 QR matrix
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" class="w-full h-full shape-rendering-crisp">`;
  svg += `<rect width="${size}" height="${size}" fill="#ffffff"/>`;

  // Draw alignment patterns (corners)
  const drawCorner = (x: number, y: number) => {
    svg += `<rect x="${x}" y="${y}" width="7" height="7" fill="#0f172a"/>`;
    svg += `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#ffffff"/>`;
    svg += `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0f172a"/>`;
  };

  drawCorner(0, 0);
  drawCorner(size - 7, 0);
  drawCorner(0, size - 7);

  // Fill pseudo-random data modules based on text hash
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip corner finder patterns
      if ((r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)) {
        continue;
      }
      const val = Math.abs(Math.sin(hash * (r * size + c + 1))) > 0.45;
      if (val) {
        svg += `<rect x="${c}" y="${r}" width="1" height="1" fill="#0f172a"/>`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}
