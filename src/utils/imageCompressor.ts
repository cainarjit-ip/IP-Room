/**
 * Utility to compress and validate user-uploaded room photos.
 * Ensures every uploaded image stays strictly under 200 KB.
 * Supported formats: JPG/JPEG, PNG, WebP.
 */

export interface ProcessedImage {
  id: string;
  dataUrl: string;
  name: string;
  sizeBytes: number;
  sizeDisplay: string;
  isMain: boolean;
}

const MAX_SIZE_BYTES = 200 * 1024; // 200 KB in bytes

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

/**
 * Validates file format and compresses image to < 200 KB using an HTML canvas.
 */
export async function compressAndProcessImage(file: File, isMain: boolean = false): Promise<ProcessedImage> {
  // 1. Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error(`Invalid file format "${file.name}". Please upload JPG, PNG, or WebP.`);
  }

  // Load image into an HTMLImageElement
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  // If already under 200 KB and valid format, we can use it or optimize it
  if (file.size <= MAX_SIZE_BYTES && file.type === 'image/jpeg') {
    return {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataUrl,
      name: file.name,
      sizeBytes: file.size,
      sizeDisplay: formatBytes(file.size),
      isMain
    };
  }

  // 2. Iterative canvas compression
  // Start with reasonable dimension downscaling if very large
  let maxDimension = 1600;
  let quality = 0.88;
  let compressedDataUrl = '';
  let compressedBytes = Infinity;

  // Attempt up to 5 passes adjusting dimensions and quality
  for (let pass = 0; pass < 6; pass++) {
    let targetWidth = img.width;
    let targetHeight = img.height;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas rendering context unavailable');
    }

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Export as image/jpeg or image/webp
    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    compressedBytes = Math.round((compressedDataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);

    if (compressedBytes <= MAX_SIZE_BYTES) {
      break;
    }

    // Step down parameters for next pass
    quality = Math.max(0.45, quality - 0.15);
    maxDimension = Math.round(maxDimension * 0.75);
  }

  if (compressedBytes > MAX_SIZE_BYTES) {
    throw new Error(
      `Could not optimize "${file.name}" below 200 KB (reached ${formatBytes(
        compressedBytes
      )}). Please choose a smaller photo.`
    );
  }

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    dataUrl: compressedDataUrl,
    name: file.name,
    sizeBytes: compressedBytes,
    sizeDisplay: formatBytes(compressedBytes),
    isMain
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image preview'));
    img.src = src;
  });
}
