import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import PremiumTouchable from './PremiumTouchable';

/**
 * PremiumPageHeader
 *
 * The official unified header component for LegalSphere.
 * Provides consistent typography, safe area handling, back navigation,
 * and elevation across the entire app for both Light and Dark modes.
 *
 * @param {string} title - Required. Main header title.
 * @param {string} [subtitle] - Optional. Smaller subtitle text below the title.
 * @param {function} [onBack] - Optional. Custom callback when the back button is pressed.
 * @param {React.ReactNode} [rightComponent] - Optional. Custom component rendered on the right side.
 * @param {number} [elevationLevel=2] - Optional (0-3). Controls shadow depth in Light mode and border/surface separation in Dark mode.
 * @param {boolean} [showBackButton] - Optional. Overrides default `canGoBack()` logic.
 */
const PremiumPageHeader = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  elevationLevel = 2,
  showBackButton,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useTheme();

  // Determine back button visibility
  const canGoBack = navigation.canGoBack();
  const displayBackButton = showBackButton !== undefined ? showBackButton : canGoBack;

  // Handle Back Press
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  // Generate memoized styles with theme tokens
  const styles = useMemo(() => createStyles(colors, resolvedTheme, insets, elevationLevel), [
    colors,
    resolvedTheme,
    insets,
    elevationLevel,
  ]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.contentRow}>
        {/* Left / Back Button */}
        <View style={styles.leftContainer}>
          {displayBackButton && (
            <PremiumTouchable
              onPress={handleBackPress}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </PremiumTouchable>
          )}
        </View>

        {/* Center / Title & Subtitle */}
        <View style={styles.centerContainer}>
          <Text
            style={styles.titleText}
            numberOfLines={1}
            accessibilityRole="header"
            accessibilityLabel={title}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right / Custom Component or Spacer */}
        <View style={styles.rightContainer}>
          {rightComponent ? rightComponent : null}
        </View>
      </View>
    </View>
  );
};

// --- Styles Factory ---
const createStyles = (colors, resolvedTheme, insets, elevationLevel) => {
  const isDark = resolvedTheme === 'dark';

  // Base background
  const backgroundColor = colors.surface;

  // Compute elevation styles based on level (0-3)
  let elevationStyles = {};
  if (elevationLevel > 0) {
    if (isDark) {
      // Dark Mode: Rely on borders, no shadow
      elevationStyles = {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      };
    } else {
      // Light Mode: Use shadow
      elevationStyles = {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: elevationLevel * 2 },
        shadowOpacity: elevationLevel * 0.05,
        shadowRadius: elevationLevel * 5,
        elevation: elevationLevel * 2, // Android
      };
    }
  }

  return StyleSheet.create({
    headerContainer: {
      backgroundColor,
      paddingTop: insets.top + 10,
      paddingBottom: 16,
      borderBottomLeftRadius: elevationLevel > 0 ? 24 : 0,
      borderBottomRightRadius: elevationLevel > 0 ? 24 : 0,
      zIndex: 10,
      ...elevationStyles,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      minHeight: 44, // Touch target minimum
    },
    leftContainer: {
      width: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    rightContainer: {
      width: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? colors.card : colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    subtitleText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 2,
    },
  });
};

export default React.memo(PremiumPageHeader);
