import type { ScanResult } from "../lib/types";

export type RootStackParamList = {
  Home: undefined;
  Profile: { mode: "onboarding" | "edit" };
  Scan: undefined;
  Results: { result: ScanResult };
  History: undefined;
};
