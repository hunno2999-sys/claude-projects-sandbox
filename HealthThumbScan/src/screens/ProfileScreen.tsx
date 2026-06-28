import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useProfile } from "../lib/ProfileContext";
import type { BloodType, Profile, Sex } from "../lib/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export default function ProfileScreen({ navigation, route }: Props) {
  const { profile, saveProfile } = useProfile();
  const isOnboarding = route.params?.mode === "onboarding";

  const [age, setAge] = useState(profile ? String(profile.age) : "");
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "female");
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : "");
  const [weightKg, setWeightKg] = useState(profile ? String(profile.weightKg) : "");
  const [bloodType, setBloodType] = useState<BloodType>(profile?.bloodType ?? "unknown");

  const handleSave = async () => {
    const ageNum = Number(age);
    const heightNum = Number(heightCm);
    const weightNum = Number(weightKg);

    if (!ageNum || ageNum < 1 || ageNum > 120) {
      Alert.alert("Check your age", "Enter an age between 1 and 120.");
      return;
    }
    if (!heightNum || heightNum < 50 || heightNum > 250) {
      Alert.alert("Check your height", "Enter a height between 50 and 250 cm.");
      return;
    }
    if (!weightNum || weightNum < 10 || weightNum > 400) {
      Alert.alert("Check your weight", "Enter a weight between 10 and 400 kg.");
      return;
    }

    const next: Profile = {
      age: ageNum,
      sex,
      heightCm: heightNum,
      weightKg: weightNum,
      bloodType,
    };
    await saveProfile(next);

    if (isOnboarding) {
      navigation.replace("Home");
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isOnboarding ? "Welcome — let's set up your profile" : "Edit profile"}</Text>
      <Text style={styles.subtitle}>
        This information personalizes your BMI and blood pressure estimates. It is stored only on
        this device.
      </Text>

      <Field label="Age (years)">
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 32"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Sex">
        <View style={styles.optionRow}>
          {SEX_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.value}
              label={opt.label}
              selected={sex === opt.value}
              onPress={() => setSex(opt.value)}
            />
          ))}
        </View>
      </Field>

      <Field label="Height (cm)">
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="e.g. 170"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Weight (kg)">
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="e.g. 65"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Blood type">
        <View style={styles.optionRow}>
          {BLOOD_TYPES.map((type) => (
            <OptionPill
              key={type}
              label={type === "unknown" ? "Unknown" : type}
              selected={bloodType === type}
              onPress={() => setBloodType(type)}
            />
          ))}
        </View>
      </Field>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isOnboarding ? "Continue" : "Save changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function OptionPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(3), paddingBottom: spacing(6) },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing(1) },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing(3), lineHeight: 20 },
  field: { marginBottom: spacing(3) },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing(1) },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    color: colors.text,
    fontSize: 16,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1) },
  pill: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pillSelected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontSize: 13 },
  pillTextSelected: { color: colors.primary, fontWeight: "600" },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing(2),
    alignItems: "center",
    marginTop: spacing(2),
  },
  saveButtonText: { color: "#06120A", fontSize: 16, fontWeight: "700" },
});
