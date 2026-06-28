import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider } from "./src/lib/ProfileContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
