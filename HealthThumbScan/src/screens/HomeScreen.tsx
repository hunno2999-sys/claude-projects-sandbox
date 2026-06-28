import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useProfile } from "../lib/ProfileContext";
import { calculateBmi, classifyBmi, BMI_LABELS } from "../lib/bmi";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { profile } = useProfile();

  const bmi = profile ? calculateBmi(profile.heightCm, profile.weightKg) : null;
  const bmiCategory = bmi ? classifyBmi(bmi) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health Thumb Scan</Text>
      <Text style={styles.subtitle}>
        Estimate your heart rate from a fingertip camera scan, plus a rough blood pressure
        estimate and your BMI.
      </Text>

      {profile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your profile</Text>
          <Row label="Age" value={`${profile.age} yrs`} />
          <Row label="Sex" value={profile.sex === "male" ? "Male" : "Female"} />
          <Row label="Height" value={`${profile.heightCm} cm`} />
          <Row label="Weight" value={`${profile.weightKg} kg`} />
          <Row label="Blood type" value={profile.bloodType === "unknown" ? "Unknown" : profile.bloodType} />
          {bmi !== null && bmiCategory && (
            <Row label="BMI" value={`${bmi.toFixed(1)} — ${BMI_LABELS[bmiCategory]}`} />
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Scan")}
      >
        <Text style={styles.primaryButtonText}>Start thumb scan</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Profile", { mode: "edit" })}
      >
        <Text style={styles.secondaryButtonText}>Edit profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={styles.secondaryButtonText}>View scan history</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        For informational purposes only. Not a medical device and not a substitute for
        professional medical advice, diagnosis, or treatment.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(3), paddingBottom: spacing(6) },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: spacing(1) },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing(3), lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing(2.5),
    marginBottom: spacing(3),
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: spacing(1.5) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing(0.75) },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing(2.25),
    alignItems: "center",
    marginBottom: spacing(2),
  },
  primaryButtonText: { color: "#06120A", fontSize: 17, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing(2),
    alignItems: "center",
    marginBottom: spacing(1.5),
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  disclaimer: { color: colors.textMuted, fontSize: 12, marginTop: spacing(2), lineHeight: 17 },
});
