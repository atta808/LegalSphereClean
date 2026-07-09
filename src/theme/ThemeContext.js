import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "./palettes";

const THEME_STORAGE_KEY = "@theme_mode";

const ThemeContext = createContext({
  currentTheme: "system",
  resolvedTheme: "light",
  colors: lightTheme,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState("system"); // 'light', 'dark', 'system'
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) {
          setCurrentTheme(storedTheme);
        }
      } catch (e) {
        console.error("Failed to load theme", e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const handleSetTheme = async (newTheme) => {
    try {
      setCurrentTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  };

  const resolvedTheme = currentTheme === "system" ? (systemColorScheme || "light") : currentTheme;
  const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      currentTheme,
      resolvedTheme,
      colors,
      setTheme: handleSetTheme,
    }),
    [currentTheme, resolvedTheme, colors]
  );

  if (!isReady) {
    return null; // Or a splash screen
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
