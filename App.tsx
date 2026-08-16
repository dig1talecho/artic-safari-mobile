import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "./i18n";
import { AuthProvider } from "./lib/useAuth";
import RootNavigation from "./navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigation />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
