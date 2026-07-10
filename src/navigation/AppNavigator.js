import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomBar from "../components/BottomBar"; // ✅ ADD THIS
import LoginScreen from "../screens/LoginScreen";
// 🟦 TAB SCREENS
import ClientsScreen from "../screens/ClientsScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DiaryScreen from "../screens/DiaryScreen";
import QuickLinksScreen from "../screens/QuickLinksScreen";
import BrowserHomeScreen from "../screens/BrowserHomeScreen";
// 🟪 STACK SCREENS
import AddCaseScreen from "../screens/AddCaseScreen";
import AddClientScreen from "../screens/AddClientScreen";
import ArchiveScreen from "../screens/ArchiveScreen";
import CalendarScreen from "../screens/CalendarScreen";
import CaseDetailScreen from "../screens/CaseDetailScreen";
import CitationsScreen from "../screens/CitationsScreen";
import ClientArchiveScreen from "../screens/ClientArchiveScreen";
import ClientProfileScreen from "../screens/ClientProfileScreen";
import FeeManagerScreen from "../screens/FeeManagerScreen";
import LawyerProfileScreen from "../screens/LawyerProfileScreen";
import MasterListScreen from "../screens/MasterListScreen";
import NotesScreen from "../screens/NotesScreen";
import ProcessFeeScreen from "../screens/ProcessFeeScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TimelineScreen from "../screens/TimelineScreen";
import LegalBrowserScreen from "../screens/LegalBrowserScreen";
import UpdateCaseHearingScreen from "../screens/UpdateCaseHearingScreen";
import DocumentVaultScreen from "../screens/DocumentVaultScreen";
import AIChatRoomScreen from "../screens/AIChatRoomScreen";
import LexAiScreen from "../screens/LexAiScreen";
import { useTheme } from "../theme/ThemeContext";
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// =======================
// 🟦 MAIN TABS
// =======================
function MainTabs({ profile, onLogout }) {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <BottomBar
          currentScreen={props.state.routeNames[
            props.state.index
          ].toLowerCase()}
          setCurrentScreen={(screen) => {
            props.navigation.navigate(
              screen.charAt(0).toUpperCase() + screen.slice(1),
            );
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard">
        {(props) => (
          <DashboardScreen {...props} profile={profile} onLogout={onLogout} />
        )}
      </Tab.Screen>

      <Tab.Screen name="Diary">
        {(props) => <DiaryScreen {...props} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Clients">
        {(props) => <ClientsScreen {...props} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Browser" component={BrowserHomeScreen} />

      <Tab.Screen name="Calendar">
        {(props) => <CalendarScreen {...props} profile={profile} />}
      </Tab.Screen>

      <Tab.Screen name="QuickLinks" component={QuickLinksScreen} />
    </Tab.Navigator>
  );
}

// =======================
// 🧭 ROOT NAVIGATOR
// =======================
export default function AppNavigator({ user, profile, onLogout }) {
  const { colors, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* MAIN */}
          <Stack.Screen name="MainTabs">
            {(props) => (
              <MainTabs {...props} profile={profile} onLogout={onLogout} />
            )}
          </Stack.Screen>

          {/* ALL SCREENS */}
          <Stack.Screen name="AddCase" component={AddCaseScreen} />
          <Stack.Screen name="AddClient" component={AddClientScreen} />
          <Stack.Screen name="Archive" component={ArchiveScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
          <Stack.Screen name="Citations" component={CitationsScreen} />
          <Stack.Screen name="ClientArchive" component={ClientArchiveScreen} />
          <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
          <Stack.Screen name="FeeManager" component={FeeManagerScreen} />
          <Stack.Screen name="Masters" component={MasterListScreen} />
          <Stack.Screen name="Notes" component={NotesScreen} />
          <Stack.Screen name="ProcessFee" component={ProcessFeeScreen} />
          <Stack.Screen name="LawyerProfile" component={LawyerProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="QuickLinks" component={QuickLinksScreen} />
          <Stack.Screen name="Timeline" component={TimelineScreen} />
          <Stack.Screen name="LegalBrowser" component={LegalBrowserScreen} />
          <Stack.Screen name="DocumentVault" component={DocumentVaultScreen} />
          <Stack.Screen
            name="UpdateCaseHearing"
            component={UpdateCaseHearingScreen}
          />
          <Stack.Screen name="AIChatRoom" component={AIChatRoomScreen} />
          <Stack.Screen name="LexAi" component={LexAiScreen} />
        </Stack.Navigator>
      ) : (
        // 🔥 THIS IS THE KEY PART
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
