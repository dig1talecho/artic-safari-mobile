import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useAuth } from "../lib/useAuth";
import { useTranslation } from "../i18n";
import { COLORS, TYPE } from "../constants/theme";
import { Loader } from "../components/ui";

import AuthScreen from "../screens/AuthScreen";
import ToursScreen from "../screens/ToursScreen";
import TourDetailScreen from "../screens/TourDetailScreen";
import MyBookingsScreen from "../screens/MyBookingsScreen";
import TrackingScreen from "../screens/TrackingScreen";
import RewardsScreen from "../screens/RewardsScreen";
import TransferScreen from "../screens/TransferScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.accent,
    background: COLORS.background,
    card: COLORS.background,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.accent,
  },
};

/** Text glyphs instead of an icon font — no extra native dependency. */
const TAB_ICON: Record<string, string> = {
  ToursTab: "❄",
  TransferTab: "➤",
  BookingsTab: "✧",
  RewardsTab: "★",
  ProfileTab: "●",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{TAB_ICON[name]}</Text>
    </View>
  );
}

function Tabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen
        name="ToursTab"
        component={ToursScreen}
        options={{ title: t("nav.tours") }}
      />
      <Tab.Screen
        name="TransferTab"
        component={TransferScreen}
        options={{ title: t("nav.transfer") }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={MyBookingsScreen}
        options={{ title: t("nav.bookings") }}
      />
      <Tab.Screen
        name="RewardsTab"
        component={RewardsScreen}
        options={{ title: t("nav.rewards") }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: t("nav.profile") }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigation() {
  const { session, loading } = useAuth();
  const { ready } = useTranslation();

  if (loading || !ready) {
    return (
      <View style={styles.splash}>
        <Loader />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: styles.stackBg }}>
        {session ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="TourDetail" component={TourDetailScreen} />
            <Stack.Screen
              name="Tracking"
              component={TrackingScreen}
              options={{ presentation: "modal" }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center" },
  stackBg: { backgroundColor: COLORS.background },
  tabBar: {
    backgroundColor: COLORS.backgroundAlt,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 84,
    paddingTop: 8,
    paddingBottom: 26,
  },
  tabLabel: { ...TYPE.caption, fontWeight: "600" },
  tabIconWrap: { alignItems: "center", justifyContent: "center" },
  tabIcon: { fontSize: 16, color: COLORS.textMuted },
  tabIconActive: { color: COLORS.accent },
});
