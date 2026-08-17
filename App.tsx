import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "./i18n";
import { AuthProvider } from "./lib/useAuth";
import { NotificationsProvider } from "./lib/useNotifications";
import RootNavigation from "./navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <NotificationsProvider>
            <StatusBar style="light" />
            <RootNavigation />
          </NotificationsProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
