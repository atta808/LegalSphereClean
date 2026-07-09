import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export const lightTheme = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  primary: "#1A73E8",
  text: "#0F172A",
  secondaryText: "#64748B",
  border: "#E2E8F0",
  divider: "#F1F5F9",
  placeholder: "#94A3B8",
  icon: "#475569",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  shadow: "#000000",
  disabled: "#E2E8F0",
  softPrimary: "rgba(26, 115, 232, 0.1)",
  softError: "rgba(239, 68, 68, 0.1)",
  softWarning: "rgba(245, 158, 11, 0.1)",
  softSuccess: "rgba(16, 185, 129, 0.1)",
};

export const darkTheme = {
  background: "#121212",
  surface: "#1E1E1E",
  card: "#242424",
  primary: "#1A73E8",
  text: "#FFFFFF",
  secondaryText: "#B3B3B3",
  border: "#333333",
  divider: "#2C2C2C",
  placeholder: "#666666",
  icon: "#CCCCCC",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  shadow: "#000000",
  disabled: "#333333",
  softPrimary: "rgba(26, 115, 232, 0.2)",
  softError: "rgba(239, 68, 68, 0.2)",
  softWarning: "rgba(245, 158, 11, 0.2)",
  softSuccess: "rgba(16, 185, 129, 0.2)",
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState("system"); // 'light', 'dark', 'system'
  const [resolvedTheme, setResolvedTheme] = useState(lightTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("appTheme");
        if (storedTheme) {
          setCurrentTheme(storedTheme);
        }
      } catch (error) {
        console.log("Error loading theme", error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    let themeToUse = currentTheme;
    if (currentTheme === "system") {
      themeToUse = systemColorScheme || "light";
    }

    if (themeToUse === "dark") {
      setResolvedTheme(darkTheme);
    } else {
      setResolvedTheme(lightTheme);
    }
  }, [currentTheme, systemColorScheme]);

  const setTheme = async (theme) => {
    try {
      setCurrentTheme(theme);
      await AsyncStorage.setItem("appTheme", theme);
    } catch (error) {
      console.log("Error saving theme", error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        resolvedTheme,
        setTheme,
        isDark: resolvedTheme === darkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
