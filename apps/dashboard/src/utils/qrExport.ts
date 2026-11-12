import QRCode from 'qrcode';
import type { QrCodeRecord } from '../types/dashboard';

const ORDER_APP_BASE_URL =
  import.meta.env.VITE_ORDER_APP_URL || 'https://order.sharonteastall.com';

export function buildQrTargetUrl(
  qr: Pick<QrCodeRecord, 'outletSlug' | 'qrToken' | 'qrUrl'>,
): string {
  if (qr.qrUrl) {
    return qr.qrUrl;
  }
  const base = ORDER_APP_BASE_URL.replace(/\/+$/, '');
  return `${base}/order/${encodeURIComponent(qr.outletSlug)}?qr=${encodeURIComponent(qr.qrToken)}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function renderStandeeCanvas(qr: QrCodeRecord): Promise<HTMLCanvasElement> {
  const width = 900;
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize canvas 2D context');
  }

  // Steamed Milk Cream canvas background
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, width, height);

  // Outer Forest Green frame
  ctx.strokeStyle = '#1C4C34';
  ctx.lineWidth = 12;
  drawRoundedRect(ctx, 28, 28, width - 56, height - 56, 36);
  ctx.stroke();

  // Top hero header banner (#1C4C34)
  ctx.fillStyle = '#1C4C34';
  drawRoundedRect(ctx, 56, 56, width - 112, 230, 28);
  ctx.fill();

  ctx.fillStyle = '#FC9C34';
  ctx.font = '600 22px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CONTACTLESS ORDERING', width / 2, 118);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 48px Georgia, serif';
  ctx.fillText('Sharon Tea & Coffee', width / 2, 182);

  ctx.fillStyle = '#FAF7F2';
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText(qr.outletName, width / 2, 236);

  // QR card frame
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 130, 330, width - 260, 640, 32);
  ctx.fill();
  ctx.strokeStyle = '#D4D4D4';
  ctx.lineWidth = 2;
  ctx.stroke();

  const targetUrl = buildQrTargetUrl(qr);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: 520,
    margin: 2,
    color: {
      dark: '#241C24',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });

  ctx.drawImage(qrCanvas, (width - 520) / 2, 370, 520, 520);

  // Standee label pill (#541424 Deep Burgundy speciality accent)
  ctx.fillStyle = '#541424';
  drawRoundedRect(ctx, 210, 910, width - 420, 44, 22);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 20px Inter, sans-serif';
  ctx.fillText(qr.label.toUpperCase(), width / 2, 939);

  // Scan instructions
  ctx.fillStyle = '#241C24';
  ctx.font = '700 32px Georgia, serif';
  ctx.fillText('Scan to Browse, Customize & Pay via UPI', width / 2, 1045);

  ctx.fillStyle = '#7C2C0C';
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('Skip the queue • Instant counter token', width / 2, 1095);

  // Footer token metadata
  ctx.fillStyle = '#6B7280';
  ctx.font = '500 18px Inter, sans-serif';
  ctx.fillText(`${qr.businessId}  •  order.sharonteastall.com`, width / 2, 1185);

  return canvas;
}

export async function downloadStandeePng(qr: QrCodeRecord): Promise<void> {
  const canvas = await renderStandeeCanvas(qr);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `sharon-standee-${qr.outletSlug}-${qr.businessId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a print-ready A5 PDF containing the high-resolution standee JPEG without external scripts or innerHTML.
 */
export async function downloadStandeePdf(qr: QrCodeRecord): Promise<void> {
  const canvas = await renderStandeeCanvas(qr);
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = jpegDataUrl.split(',')[1];
  const binaryString = atob(base64);
  const imgBytes = new Uint8Array(new ArrayBuffer(binaryString.length));
  for (let i = 0; i < binaryString.length; i += 1) {
    imgBytes[i] = binaryString.charCodeAt(i);
  }

  // A5 portrait in PDF points (420 x 595 pt)
  const pageWidth = 420;
  const pageHeight = 595;

  const encoder = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const pushText = (text: string) => {
    const bytes = encoder.encode(text).slice();
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array<ArrayBuffer>) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  pushText('%PDF-1.4\n');

  offsets.push(byteLength);
  pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets.push(byteLength);
  pushText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets.push(byteLength);
  pushText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  offsets.push(byteLength);
  pushText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`,
  );
  pushBytes(imgBytes);
  pushText('\nendstream\nendobj\n');

  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets.push(byteLength);
  pushText(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
  );

  const xrefOffset = byteLength;
  pushText(`xref\n0 ${offsets.length}\n`);
  pushText('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i += 1) {
    pushText(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  pushText(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const pdfBlob = new Blob(chunks, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `sharon-standee-${qr.outletSlug}-${qr.businessId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
