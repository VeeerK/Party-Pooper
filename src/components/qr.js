/**
 * QR Code Canvas Generator Component
 */

export function drawQRCode(canvas, text, fallbackPin = '-----') {
  const ctx = canvas.getContext('2d');
  const size = canvas.width || 140;
  canvas.width = size;
  canvas.height = size;
  
  ctx.clearRect(0, 0, size, size);
  
  // Try loading real QR from API
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=0d0e12&bgcolor=ffffff`;
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
  };
  
  img.onerror = () => {
    // Fallback: draw a gorgeous premium room-badge with faux QR corner patterns
    drawOfflineBadge(ctx, size, fallbackPin);
  };
}

function drawOfflineBadge(ctx, size, pin) {
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Draw Corner Finder Patterns (standard QR markers)
  ctx.fillStyle = '#0d0e12';
  
  const markerSize = Math.floor(size * 0.22); // ~30px for 140px size
  const drawMarker = (x, y) => {
    // Outer square
    ctx.fillRect(x, y, markerSize, markerSize);
    // Inner white space
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3, y + 3, markerSize - 6, markerSize - 6);
    // Center square
    ctx.fillStyle = '#0d0e12';
    ctx.fillRect(x + 6, y + 6, markerSize - 12, markerSize - 12);
  };
  
  // Top Left
  drawMarker(6, 6);
  // Top Right
  drawMarker(size - markerSize - 6, 6);
  // Bottom Left
  drawMarker(6, size - markerSize - 6);
  
  // Draw random pixels (simulated matrix)
  ctx.fillStyle = '#1e293b';
  const padding = 6;
  const startY = markerSize + 12;
  const endY = size - markerSize - 12;
  
  for (let y = padding; y < size - padding; y += 4) {
    for (let x = padding; x < size - padding; x += 4) {
      // Avoid overlapping markers
      const inTopLeft = (x < markerSize + 10 && y < markerSize + 10);
      const inTopRight = (x > size - markerSize - 10 && y < markerSize + 10);
      const inBottomLeft = (x < markerSize + 10 && y > size - markerSize - 10);
      
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        // Pseudo-random noise
        if (Math.sin(x * 0.5 + y * 0.9) > 0.1) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }
  }
  
  // Draw glowing code pill in the middle
  const pillW = Math.floor(size * 0.65);
  const pillH = Math.floor(size * 0.22);
  const pillX = Math.floor((size - pillW) / 2);
  const pillY = Math.floor((size - pillH) / 2);
  
  // Draw pill background (glow styling)
  ctx.fillStyle = '#8b5cf6'; // Violet
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 8);
  ctx.fill();
  
  // Draw PIN text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pin, size / 2, size / 2);
}
