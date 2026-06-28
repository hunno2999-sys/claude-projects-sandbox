import { decode } from "jpeg-js";
import { Buffer } from "buffer";

/**
 * Decodes a base64 JPEG frame (as returned by CameraView.takePictureAsync)
 * and returns the mean red-channel intensity over the central region of the
 * image. With a fingertip pressed against the lens and the torch on, this
 * value rises and falls with each heartbeat (see src/lib/ppg.ts).
 */
export function meanRedChannel(base64Jpeg: string): number {
  const buffer = Buffer.from(base64Jpeg, "base64");
  const { width, height, data } = decode(buffer, { useTArray: true });

  // Sample the central 50% of the frame to avoid edge vignetting / uneven
  // finger coverage skewing the result.
  const xStart = Math.floor(width * 0.25);
  const xEnd = Math.ceil(width * 0.75);
  const yStart = Math.floor(height * 0.25);
  const yEnd = Math.ceil(height * 0.75);

  let sum = 0;
  let count = 0;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = (y * width + x) * 4; // RGBA
      sum += data[idx]; // red channel
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}
