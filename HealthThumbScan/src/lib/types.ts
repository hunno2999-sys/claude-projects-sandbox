export type Sex = "male" | "female";

export type BloodType =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bloodType: BloodType;
}

export interface ScanResult {
  id: string;
  takenAt: string;
  heartRateBpm: number;
  signalQuality: "good" | "fair" | "poor";
  systolic: number;
  diastolic: number;
  bmi: number;
  bmiCategory: BmiCategory;
  profileSnapshot: Profile;
}

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese";
