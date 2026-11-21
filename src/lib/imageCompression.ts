export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  summaryText: string;
}

const MAX_DIMENSION = 1000;
const TARGET_MAX_BYTES = 300 * 1024;
const INITIAL_QUALITY = 0.7;
const MIN_QUALITY = 0.1;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة ملف الصورة المحدد'));
    };
    img.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('تعذر ضغط الصورة إلى صيغة JPEG'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function compressImageClientSide(file: File): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة صالح');
  }

  const img = await loadImageElement(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.max(1, Math.round((height * MAX_DIMENSION) / width));
      width = MAX_DIMENSION;
    } else {
      width = Math.max(1, Math.round((width * MAX_DIMENSION) / height));
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('المتصفح لا يدعم معالجة الصور');
  }

  // Fill white backdrop so transparent PNG/WebP images convert cleanly to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, Number((quality - 0.08).toFixed(2)));
    blob = await canvasToJpegBlob(canvas, quality);
  }

  // Extra safety scale-down only if image is still > 300KB at minimum quality
  let currentScale = 1;
  while (blob.size > TARGET_MAX_BYTES && currentScale > 0.5) {
    currentScale = Number((currentScale - 0.15).toFixed(2));
    const scaledWidth = Math.max(1, Math.round(width * currentScale));
    const scaledHeight = Math.max(1, Math.round(height * currentScale));
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    blob = await canvasToJpegBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  const compressedFile = new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  const previewUrl = URL.createObjectURL(compressedFile);
  const originalLabel = formatFileSize(file.size);
  const compressedLabel = formatFileSize(compressedFile.size);

  return {
    file: compressedFile,
    previewUrl,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    summaryText: `تم ضغط الصورة من ${originalLabel} إلى ${compressedLabel}`,
  };
}
