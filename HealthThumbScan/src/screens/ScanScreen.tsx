import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useProfile } from "../lib/ProfileContext";
import { estimateHeartRate, type PpgSample } from "../lib/ppg";
import { meanRedChannel } from "../lib/frameAnalysis";
import { calculateBmi, classifyBmi } from "../lib/bmi";
import { estimateBloodPressure } from "../lib/bpEstimate";
import { addScanResult } from "../lib/storage";
import { generateId } from "../lib/id";
import type { ScanResult } from "../lib/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

const SCAN_DURATION_MS = 16_000;
const CAPTURE_INTERVAL_MS = 120;

type Phase = "intro" | "scanning" | "processing";

export default function ScanScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("intro");
  const [progress, setProgress] = useState(0);

  const cameraRef = useRef<CameraView | null>(null);
  const samplesRef = useRef<PpgSample[]>([]);
  const isRunningRef = useRef(false);
  const startTimeRef = useRef(0);

  const stopScan = useCallback(() => {
    isRunningRef.current = false;
  }, []);

  useEffect(() => stopScan, [stopScan]);

  const finishScan = useCallback(() => {
    setPhase("processing");
    const estimate = estimateHeartRate(samplesRef.current);

    if (!estimate || !profile) {
      Alert.alert(
        "Couldn't get a clear reading",
        "Make sure your fingertip fully covers the camera lens and flash, hold still, and try again.",
        [{ text: "Try again", onPress: () => setPhase("intro") }],
      );
      return;
    }

    const bmi = calculateBmi(profile.heightCm, profile.weightKg);
    const bp = estimateBloodPressure(estimate.bpm, profile.age, bmi);

    const result: ScanResult = {
      id: generateId(),
      takenAt: new Date().toISOString(),
      heartRateBpm: estimate.bpm,
      signalQuality: estimate.quality,
      systolic: bp.systolic,
      diastolic: bp.diastolic,
      bmi,
      bmiCategory: classifyBmi(bmi),
      profileSnapshot: profile,
    };

    addScanResult(result).finally(() => {
      navigation.replace("Results", { result });
    });
  }, [navigation, profile]);

  const captureLoop = useCallback(async () => {
    while (isRunningRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= SCAN_DURATION_MS) break;
      setProgress(Math.min(1, elapsed / SCAN_DURATION_MS));

      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0,
          skipProcessing: true,
          base64: true,
        });
        if (photo?.base64 && isRunningRef.current) {
          const v = meanRedChannel(photo.base64);
          samplesRef.current.push({ t: Date.now() - startTimeRef.current, v });
        }
      } catch {
        // Skip a bad frame and keep going; isolated failures don't invalidate the scan.
      }

      await new Promise((resolve) => setTimeout(resolve, CAPTURE_INTERVAL_MS));
    }

    if (isRunningRef.current) {
      isRunningRef.current = false;
      setProgress(1);
      finishScan();
    }
  }, [finishScan]);

  const startScan = useCallback(() => {
    samplesRef.current = [];
    startTimeRef.current = Date.now();
    isRunningRef.current = true;
    setProgress(0);
    setPhase("scanning");
    captureLoop();
  }, [captureLoop]);

  const handleCancel = () => {
    stopScan();
    navigation.goBack();
  };

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.subtitle}>
          This scan uses your rear camera and flash to detect your pulse through your fingertip.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant camera access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={phase === "scanning"}
        />
        {phase !== "scanning" && (
          <View style={styles.cameraOverlay}>
            <Text style={styles.overlayText}>
              {phase === "intro"
                ? "Gently cover the rear camera and flash with your fingertip"
                : "Analyzing your pulse…"}
            </Text>
          </View>
        )}
      </View>

      {phase === "scanning" && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      <View style={styles.footer}>
        {phase === "intro" && (
          <>
            <Text style={styles.subtitle}>
              Hold your phone still and keep your fingertip fully covering the lens and flash for
              about {Math.round(SCAN_DURATION_MS / 1000)} seconds.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={startScan}>
              <Text style={styles.primaryButtonText}>Begin scan</Text>
            </TouchableOpacity>
          </>
        )}
        {phase === "scanning" && (
          <Text style={styles.subtitle}>Hold still… {Math.round((1 - progress) * (SCAN_DURATION_MS / 1000))}s left</Text>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing(3) },
  center: { justifyContent: "center" },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing(1) },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing(2), lineHeight: 20, textAlign: "center" },
  cameraWrap: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: spacing(2),
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(3),
  },
  overlayText: { color: colors.text, fontSize: 16, textAlign: "center", fontWeight: "600" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginBottom: spacing(2),
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  footer: { paddingBottom: spacing(1) },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing(2.25),
    alignItems: "center",
    marginBottom: spacing(1.5),
  },
  primaryButtonText: { color: "#06120A", fontSize: 17, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing(1.75),
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: "600" },
});
