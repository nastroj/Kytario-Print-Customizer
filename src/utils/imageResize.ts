/**
 * Resizes and compresses an image file to a Base64 Data URL.
 * Keeps aspect ratio while constraining the longest side to maxDimension.
 */
export async function resizeAndCompressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('FileReader result is not a string'));
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Only downscale if the image is larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(reader.result as string); // Fallback to raw data url if context unavailable
          }

          // Image smoothing for high quality downscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // For transparent PNGs or WebP, preserve format when possible
          const isPng = file.type === 'image/png';
          if (!isPng) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Output format: keep PNG for transparency if originally PNG, otherwise JPEG for high compression
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);

          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas resizing failed, falling back to original data URL', err);
          resolve(reader.result as string);
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
