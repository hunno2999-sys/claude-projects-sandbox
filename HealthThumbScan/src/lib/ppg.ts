/**
 * Heart-rate estimation from a photoplethysmography (PPG) style brightness
 * signal captured by pointing the rear camera (with torch on) at a fingertip.
 * Blood volume changes during each heartbeat modulate how much light passes
 * through the finger, producing a roughly periodic brightness signal that the
 * camera picks up as the average red-channel intensity of each frame.
 *
 * This is a best-effort estimate, not a clinical-grade measurement: rolling
 * shutter exposure changes, motion, and finger pressure all add noise.
 */

export interface PpgSample {
  /** milliseconds since scan start */
  t: number;
  /** mean red-channel intensity of the frame, 0-255 */
  v: number;
}

export interface HeartRateEstimate {
  bpm: number;
  quality: "good" | "fair" | "poor";
  beatsDetected: number;
}

const MIN_BPM = 40;
const MAX_BPM = 180;
/** refractory period between accepted beats, matching MAX_BPM */
const MIN_PEAK_DISTANCE_MS = 60_000 / MAX_BPM;

function movingAverage(samples: number[], windowSize: number): number[] {
  if (windowSize <= 1) return samples.slice();
  const half = Math.floor(windowSize / 2);
  const out = new Array<number>(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(samples.length - 1, i + half); j++) {
      sum += samples[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Estimates the average sampling interval in ms so the smoothing windows
 * below can be expressed in samples even though takePictureAsync() loops
 * don't fire at a perfectly fixed rate.
 */
function estimateSampleIntervalMs(samples: PpgSample[]): number {
  if (samples.length < 2) return 100;
  const span = samples[samples.length - 1].t - samples[0].t;
  return span / (samples.length - 1);
}

export function estimateHeartRate(samples: PpgSample[]): HeartRateEstimate | null {
  const MIN_DURATION_MS = 8_000;
  const MIN_SAMPLES = 40;

  if (samples.length < MIN_SAMPLES) return null;
  const duration = samples[samples.length - 1].t - samples[0].t;
  if (duration < MIN_DURATION_MS) return null;

  const intervalMs = estimateSampleIntervalMs(samples);
  const values = samples.map((s) => s.v);

  // Light smoothing to remove single-frame shot noise.
  const smoothWindow = Math.max(2, Math.round(150 / intervalMs));
  const smoothed = movingAverage(values, smoothWindow);

  // Subtract a slower-moving baseline to cancel drift from finger pressure
  // or ambient light changes, leaving just the pulsatile component.
  const baselineWindow = Math.max(smoothWindow * 2, Math.round(1500 / intervalMs));
  const baseline = movingAverage(smoothed, baselineWindow);
  const detrended = smoothed.map((v, i) => v - baseline[i]);

  const noiseFloor = standardDeviation(detrended);
  if (noiseFloor < 0.05) return null; // flat signal: finger likely not covering lens

  const minPeakDistanceSamples = Math.max(1, Math.round(MIN_PEAK_DISTANCE_MS / intervalMs));
  const peakIndices: number[] = [];
  for (let i = 1; i < detrended.length - 1; i++) {
    const isLocalMax = detrended[i] > detrended[i - 1] && detrended[i] >= detrended[i + 1];
    const isProminent = detrended[i] > noiseFloor * 0.4;
    if (!isLocalMax || !isProminent) continue;

    const last = peakIndices[peakIndices.length - 1];
    if (last !== undefined && samples[i].t - samples[last].t < MIN_PEAK_DISTANCE_MS) {
      if (detrended[i] > detrended[last]) peakIndices[peakIndices.length - 1] = i;
      continue;
    }
    peakIndices.push(i);
  }

  if (peakIndices.length < 4) return null;

  const intervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    intervals.push(samples[peakIndices[i]].t - samples[peakIndices[i - 1]].t);
  }

  const instantBpms = intervals
    .map((ms) => 60_000 / ms)
    .filter((bpm) => bpm >= MIN_BPM && bpm <= MAX_BPM);

  if (instantBpms.length < 3) return null;

  const sorted = [...instantBpms].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const cv = standardDeviation(instantBpms) / median;

  let quality: HeartRateEstimate["quality"] = "poor";
  if (instantBpms.length >= 8 && cv < 0.12) quality = "good";
  else if (instantBpms.length >= 5 && cv < 0.25) quality = "fair";

  return {
    bpm: Math.round(median),
    quality,
    beatsDetected: peakIndices.length,
  };
}
