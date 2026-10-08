import { Jimp } from 'jimp';

const MAX_BYTES = 16 * 1024 * 1024;

/** Downloads an image; throws with a readable reason when it can't. */
export async function fetchImage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(`could not download image (HTTP ${response.status}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new Error(`image is empty or larger than 16 MB: ${url}`);
  }

  return buffer;
}

/**
 * WhatsApp photos must be JPEG, and every photo or link card carries a tiny
 * inline JPEG thumbnail. Returns both, plus the full image's dimensions.
 */
export async function prepareImage(buffer) {
  const image = await Jimp.read(buffer);
  const { width, height } = image.bitmap;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const jpeg = isJpeg ? buffer : await image.getBuffer('image/jpeg', { quality: 90 });

  const thumbnail = await image
    .clone()
    .scaleToFit({ w: 320, h: 320 })
    .getBuffer('image/jpeg', { quality: 60 });

  return { jpeg, thumbnail, width, height };
}
