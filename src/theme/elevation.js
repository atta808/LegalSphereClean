
export const elevation = {
  getElevation: (level, colors, isDark) => {
    if (level === 0) return {};

    if (isDark) {
      // Dark Mode relies on borders instead of shadows
      return {
        borderWidth: 1,
        borderColor: colors.border,
      };
    }

    // Light Mode relies on subtle shadows
    return {
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: level * 2 },
      shadowOpacity: level * 0.05,
      shadowRadius: level * 3,
      elevation: level * 2, // Android
    };
  }
};
