/**
 * Small, dependency-free async file-reading helpers.
 *
 * These replace the legacy callback-based `FileReader` usage with the modern
 * non-blocking `File.text()` / `File.arrayBuffer()` APIs (with a safe
 * FileReader fallback for older browsers).
 */

/** Read a text file without blocking the main thread with FileReader callbacks. */
export async function readFileAsText(file: File | Blob): Promise<string> {
  if (typeof (file as File).text === 'function') {
    return (file as File).text();
  }
  // Fallback for environments without Blob.prototype.text
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file);
  });
}

/** Read a binary file asynchronously (used for ZIP archives and images). */
export async function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if (typeof (file as File).arrayBuffer === 'function') {
    return (file as File).arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

/** Read an image file as a Base64 data URL (async, non-blocking). */
export async function readFileAsDataUrl(file: File | Blob): Promise<string> {
  if (typeof (file as File).text === 'function' && typeof FileReader !== 'undefined') {
    // Data URLs require FileReader; wrap it in a promise so callers can await.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'));
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.readAsDataURL(file);
    });
  }
  // Modern fallback: convert array buffer to base64 data URL manually.
  const buffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack limits on huge files
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const mime = file.type || 'application/octet-stream';
  return `data:${mime};base64,${btoa(binary)}`;
}
