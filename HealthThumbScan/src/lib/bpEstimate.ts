/**
 * Rough blood pressure *estimate*, derived from the camera-measured heart
 * rate plus the user's age and BMI using simple population-trend heuristics
 * (older age and higher BMI tend to correlate with higher resting BP; a
 * faster resting heart rate is a weak additional signal).
 *
 * This is NOT a validated clinical model and a thumb/camera scan cannot
 * measure blood pressure directly - real BP measurement requires an
 * inflatable cuff (or an invasive arterial line). Treat this number as a
 * ballpark, informational figure only. See DISCLAIMER below, which is also
 * surfaced in the UI.
 */

export const BP_DISCLAIMER =
  "This app cannot measure blood pressure directly from a camera scan. " +
  "The heart rate is a best-effort camera-based pulse estimate, and the " +
  "blood pressure value below is a rough, non-clinical estimate derived " +
  "from that heart rate plus your age and BMI. It is not a medical " +
  "diagnosis. Use a validated blood pressure cuff for real readings, and " +
  "consult a healthcare professional for any health concerns.";

export interface BloodPressureEstimate {
  systolic: number;
  diastolic: number;
  category: BpCategory;
}

export type BpCategory =
  | "low"
  | "normal"
  | "elevated"
  | "stage1"
  | "stage2"
  | "crisis";

export const BP_CATEGORY_LABELS: Record<BpCategory, string> = {
  low: "Low",
  normal: "Normal",
  elevated: "Elevated",
  stage1: "Hypertension Stage 1",
  stage2: "Hypertension Stage 2",
  crisis: "Hypertensive Crisis",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function estimateBloodPressure(
  heartRateBpm: number,
  age: number,
  bmi: number,
): BloodPressureEstimate {
  const hrDelta = heartRateBpm - 70;
  const bmiDelta = bmi - 22;

  const rawSystolic = 100 + 0.5 * age + 0.6 * bmiDelta + 0.2 * hrDelta;
  const rawDiastolic = 65 + 0.25 * age + 0.35 * bmiDelta + 0.1 * hrDelta;

  const systolic = Math.round(clamp(rawSystolic, 85, 200));
  const diastolic = Math.round(clamp(Math.min(rawDiastolic, systolic - 15), 50, 120));

  return {
    systolic,
    diastolic,
    category: classifyBloodPressure(systolic, diastolic),
  };
}

export function classifyBloodPressure(systolic: number, diastolic: number): BpCategory {
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  if (systolic < 90 || diastolic < 60) return "low";
  return "normal";
}
