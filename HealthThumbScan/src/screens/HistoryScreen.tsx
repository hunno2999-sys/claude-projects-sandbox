import React, { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { clearHistory, loadHistory } from "../lib/storage";
import { BP_CATEGORY_LABELS, classifyBloodPressure } from "../lib/bpEstimate";
import type { ScanResult } from "../lib/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<ScanResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, []),
  );

  const handleClear = () => {
    Alert.alert("Clear history?", "This removes all saved scan results from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearHistory();
          setHistory([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Scan history</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No scans yet. Run a thumb scan from the home screen.</Text>
        }
        renderItem={({ item }) => {
          const category = classifyBloodPressure(item.systolic, item.diastolic);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Results", { result: item })}
            >
              <Text style={styles.cardDate}>{new Date(item.takenAt).toLocaleString()}</Text>
              <View style={styles.cardRow}>
                <Metric label="HR" value={`${item.heartRateBpm} bpm`} />
                <Metric label="BP" value={`${item.systolic}/${item.diastolic}`} />
                <Metric label="BMI" value={item.bmi.toFixed(1)} />
              </View>
              <Text style={styles.cardCategory}>{BP_CATEGORY_LABELS[category]}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing(3), paddingBottom: spacing(6) },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing(2) },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  clearText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing(6) },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2.5),
    marginBottom: spacing(1.5),
  },
  cardDate: { color: colors.textMuted, fontSize: 12, marginBottom: spacing(1) },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  metric: { alignItems: "flex-start" },
  metricLabel: { color: colors.textMuted, fontSize: 11 },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  cardCategory: { color: colors.primary, fontSize: 12, fontWeight: "600", marginTop: spacing(1) },
});
