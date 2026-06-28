import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { useProfile } from "../lib/ProfileContext";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ScanScreen from "../screens/ScanScreen";
import ResultsScreen from "../screens/ResultsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={profile ? "Home" : "Profile"}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Health Thumb Scan" }} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          initialParams={{ mode: profile ? "edit" : "onboarding" }}
          options={({ route }) => ({
            title: route.params?.mode === "onboarding" ? "Set up profile" : "Edit profile",
            headerBackVisible: route.params?.mode !== "onboarding",
            gestureEnabled: route.params?.mode !== "onboarding",
          })}
        />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Thumb scan" }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Results" }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: "History" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
