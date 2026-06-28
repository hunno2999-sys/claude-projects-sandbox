import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BP_CATEGORY_LABELS, BP_DISCLAIMER, classifyBloodPressure } from "../lib/bpEstimate";
import { BMI_LABELS } from "../lib/bmi";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

const QUALITY_LABELS: Record<string, string> = {
  good: "Good signal",
  fair: "Fair signal",
  poor: "Poor signal",
};

export default function ResultsScreen({ navigation, route }: Props) {
  const { result } = route.params;
  const bpCategory = classifyBloodPressure(result.systolic, result.diastolic);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan results</Text>
      <Text style={styles.timestamp}>{new Date(result.takenAt).toLocaleString()}</Text>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Heart rate</Text>
        <Text style={styles.metricValue}>{result.heartRateBpm} bpm</Text>
        <Text style={styles.metricMeta}>{QUALITY_LABELS[result.signalQuality]}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Estimated blood pressure</Text>
        <Text style={styles.metricValue}>
          {result.systolic}/{result.diastolic} mmHg
        </Text>
        <Text style={styles.metricMeta}>{BP_CATEGORY_LABELS[bpCategory]}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>BMI</Text>
        <Text style={styles.metricValue}>{result.bmi.toFixed(1)}</Text>
        <Text style={styles.metricMeta}>{BMI_LABELS[result.bmiCategory]}</Text>
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>About these numbers</Text>
        <Text style={styles.disclaimerText}>{BP_DISCLAIMER}</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.replace("Scan")}
      >
        <Text style={styles.primaryButtonText}>Scan again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.secondaryButtonText}>Back to home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={styles.secondaryButtonText}>View history</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(3), paddingBottom: spacing(6) },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  timestamp: { color: colors.textMuted, fontSize: 13, marginBottom: spacing(3) },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  metricLabel: { color: colors.textMuted, fontSize: 13, marginBottom: spacing(0.5) },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: "700" },
  metricMeta: { color: colors.primary, fontSize: 13, marginTop: spacing(0.5), fontWeight: "600" },
  disclaimerBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: spacing(2.5),
    marginTop: spacing(1),
    marginBottom: spacing(3),
  },
  disclaimerTitle: { color: colors.warning, fontSize: 13, fontWeight: "700", marginBottom: spacing(1) },
  disclaimerText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
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
    marginBottom: spacing(1.5),
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: "600" },
});
