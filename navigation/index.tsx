import { StyleSheet, Text, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useAuth } from "../lib/useAuth";
import { useTranslation } from "../i18n";
import { useNotifications } from "../lib/useNotifications";
import NotificationBanner from "../components/NotificationBanner";
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
import RequestsScreen from "../screens/RequestsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/** Lets the notification banner jump to the queue from outside the tree. */
export const navigationRef = createNavigationContainerRef<any>();

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
  RequestsTab: "◈",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{TAB_ICON[name]}</Text>
    </View>
  );
}

const tabScreenOptions = ({ route }: any) => ({
  headerShown: false,
  tabBarStyle: styles.tabBar,
  tabBarActiveTintColor: COLORS.accent,
  tabBarInactiveTintColor: COLORS.textMuted,
  tabBarLabelStyle: styles.tabLabel,
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <TabIcon name={route.name} focused={focused} />
  ),
});

/** Guests: browse, book, track their own trip, spend points. */
function CustomerTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="ToursTab" component={ToursScreen} options={{ title: t("nav.tours") }} />
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
      <Tab.Screen name="RewardsTab" component={RewardsScreen} options={{ title: t("nav.rewards") }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: t("nav.profile") }} />
    </Tab.Navigator>
  );
}

/**
 * Staff (admin + driver): the request queue first, since that is the job.
 * No Rewards or Transfer-booking tabs — those are customer actions, and a
 * staff account has no loyalty balance or bookings of its own.
 *
 * Admin and driver share this tree deliberately: RLS already gives them
 * different rows from the same query, so a second near-identical navigator
 * would add maintenance cost without adding any real separation.
 */
function StaffTabs() {
  const { t } = useTranslation();
  const { unseenCount } = useNotifications();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="RequestsTab"
        component={RequestsScreen}
        options={{
          title: t("nav.requests"),
          // Native tab badge -- the count the driver sees from any tab.
          tabBarBadge: unseenCount > 0 ? unseenCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="ToursTab" component={ToursScreen} options={{ title: t("nav.tours") }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: t("nav.profile") }} />
    </Tab.Navigator>
  );
}

export default function RootNavigation() {
  const { session, role, loading } = useAuth();
  const { ready } = useTranslation();

  if (loading || !ready) {
    return (
      <View style={styles.splash}>
        <Loader />
      </View>
    );
  }

  const isStaff = role === "admin" || role === "driver";

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navTheme} ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: styles.stackBg }}>
          {session ? (
            <>
              <Stack.Screen name="Tabs" component={isStaff ? StaffTabs : CustomerTabs} />
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

      {/*
        Sits OUTSIDE NavigationContainer so it floats above every screen —
        a driver reading a tour detail still sees the ride come in. Only
        staff ever get one (useNotifications is gated on role).
      */}
      {isStaff ? (
        <NotificationBanner
          onPress={() => {
            if (navigationRef.isReady()) navigationRef.navigate("Tabs", { screen: "RequestsTab" });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
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
  // Dispatch amber, not brand cyan: a waiting ride should not look decorative.
  badge: {
    backgroundColor: COLORS.dispatch,
    color: "#20160A",
    fontSize: 11,
    fontWeight: "800",
  },
});
