import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, ScanResult } from "./types";

const PROFILE_KEY = "health-thumb-scan:profile";
const HISTORY_KEY = "health-thumb-scan:history";
const MAX_HISTORY = 50;

export async function loadProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadHistory(): Promise<ScanResult[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? (JSON.parse(raw) as ScanResult[]) : [];
}

export async function addScanResult(result: ScanResult): Promise<ScanResult[]> {
  const history = await loadHistory();
  const updated = [result, ...history].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
