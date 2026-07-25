import React, { useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import PremiumTouchable from "./PremiumTouchable";

// Typography - robust import with fallback
let typography;
try {
  const typoModule = require("../theme/typography");
  if (typoModule && typoModule.typography) {
    typography = typoModule.typography;
  } else if (typoModule && typeof typoModule === "object") {
    typography = typoModule.default || typoModule;
  } else {
    throw new Error("Invalid typography export");
  }
} catch {
  typography = {
    sizes: {
      xs: 10,
      sm: 12,
      md: 13,
      lg: 16,
      xl: 18,
      xxl: 20,
      xxxl: 24,
    },
    weights: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "900",
    },
  };
}

/**
 * PremiumPageHeader V5.2 (Branded Premium Design)
 *
 * The single source of truth for all LegalSphere headers.
 * Production-grade, accessible, theme-aware, and fully backward compatible.
 *
 * @param {Object} props
 * @param {string} props.title - Main header title (required)
 * @param {string} props.subtitle - Optional subtitle text
 * @param {boolean} props.showBackButton - Override back button visibility
 * @param {Function} props.onBack - Custom back press handler
 * @param {React.ReactNode} props.rightComponent - Legacy custom right component
 * @param {number} props.elevationLevel - 0-3 controls shadow depth (default: 2)
 * @param {React.ReactNode|string} props.footer - Footer content (string or component)
 * @param {Array} props.actions - Action buttons configuration
 * @param {boolean} props.showAvatar - Show avatar
 * @param {string|object} props.avatarSource - Avatar source (require, URI, or object)
 * @param {string} props.headerVariant - 'default' | 'compact' | 'large' | 'dashboard' | 'glass' | 'minimal'
 * @param {string} props.backgroundVariant - 'surface' | 'primary' | 'transparent'
 * @param {boolean} props.showDivider - Show bottom divider (default: true)
 * @param {boolean} props.showShadow - Show shadow elevation (default: true)
 * @param {boolean} props.compact - Reduce padding (default: false)
 * @param {boolean} props.loading - Show loading state
 * @param {React.ReactNode} props.children - Custom content between header and footer
 * @param {string} props.profileName - Lawyer name (dashboard variant)
 * @param {string} props.jurisdiction - Jurisdiction text (dashboard variant)
 * @param {string} props.profileSubtitle - Additional subtitle (dashboard variant)
 * @param {string} props.profileStatus - Status badge text (dashboard variant)
 * @param {number} props.notificationCount - Notification badge count (dashboard variant)
 */
const PremiumPageHeader = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  elevationLevel = 2,
  showBackButton,
  footer,
  actions = [],
  showAvatar = false,
  avatarSource = null,
  headerVariant = "default",
  backgroundVariant = "surface",
  showDivider = true,
  showShadow = true,
  compact = false,
  loading = false,
  children,
  profileName,
  jurisdiction,
  profileSubtitle,
  profileStatus,
  notificationCount = 0,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const prevBadgeCount = useRef(0);

  const canGoBack = navigation.canGoBack();
  const displayBackButton =
    showBackButton !== undefined ? showBackButton : canGoBack;
  const isDashboard = headerVariant === "dashboard";
  const isLarge = headerVariant === "large";
  const isCompact = compact || headerVariant === "compact";
  const isMinimal = headerVariant === "minimal";
  const isGlass = headerVariant === "glass";
  const isPrimary = backgroundVariant === "primary";
  const isTransparent = backgroundVariant === "transparent";

  // Entrance animation sequence
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  // Animate badge when count changes
  useEffect(() => {
    const currentBadge =
      actions.reduce((sum, a) => sum + (a.badge || 0), 0) + notificationCount;
    const prevBadge = prevBadgeCount.current;
    const hasBadge = currentBadge > 0;
    const badgeChanged = currentBadge !== prevBadge;

    if (hasBadge && badgeChanged) {
      Animated.sequence([
        Animated.spring(badgeScaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevBadgeCount.current = currentBadge;
  }, [actions, notificationCount, badgeScaleAnim]);

  const handleBackPress = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (canGoBack) {
      navigation.goBack();
    }
  }, [onBack, canGoBack, navigation]);

  // Compute values for styles
  const computed = useMemo(
    () => ({
      displayBackButton,
      showAvatar,
      isDashboard,
      isLarge,
      isCompact,
      isMinimal,
      isGlass,
      isPrimary,
      isTransparent,
      hasActions: actions.length > 0,
      hasRightComponent: !!rightComponent,
      hasFooter: !!footer,
      hasChildren: !!children,
      showDivider,
      showShadow,
      elevationLevel,
    }),
    [
      displayBackButton,
      showAvatar,
      isDashboard,
      isLarge,
      isCompact,
      isMinimal,
      isGlass,
      isPrimary,
      isTransparent,
      actions.length,
      rightComponent,
      footer,
      children,
      showDivider,
      showShadow,
      elevationLevel,
    ],
  );

  const styles = useMemo(
    () => createStyles(colors, resolvedTheme, insets, computed, isDashboard),
    [colors, resolvedTheme, insets, computed, isDashboard],
  );

  // Render action buttons
  const renderActionButtons = useCallback(() => {
    if (!actions.length) return null;

    return actions.map((action, index) => {
      const isDisabled = action.disabled || loading;
      const isLoading = action.loading || loading;
      const hasBadge = action.badge && action.badge > 0;

      return (
        <PremiumTouchable
          key={`action-${index}`}
          onPress={action.onPress}
          disabled={isDisabled}
          style={[
            styles.actionButton,
            action.variant === "primary" && styles.actionButtonPrimary,
            action.variant === "outline" && styles.actionButtonOutline,
            action.backgroundColor && {
              backgroundColor: action.backgroundColor,
            },
            isDisabled && styles.actionButtonDisabled,
          ]}
          accessibilityLabel={action.accessibilityLabel || action.icon}
          accessibilityHint={
            action.accessibilityHint || `Activate ${action.icon}`
          }
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={action.color || "#FFFFFF"} />
          ) : (
            <>
              <Ionicons
                name={action.icon}
                size={action.size || 22}
                color={action.color || "#FFFFFF"}
              />
              {hasBadge ? (
                <Animated.View
                  style={[
                    styles.badgeContainer,
                    action.badgeColor && { backgroundColor: action.badgeColor },
                    { transform: [{ scale: badgeScaleAnim }] },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {action.badge > 9 ? "9+" : action.badge}
                  </Text>
                </Animated.View>
              ) : null}
            </>
          )}
        </PremiumTouchable>
      );
    });
  }, [actions, loading, styles, badgeScaleAnim]);

  // Render notification badge (dashboard variant)
  const renderNotificationBadge = useCallback(() => {
    if (!isDashboard || notificationCount === 0) return null;

    return (
      <Animated.View
        style={[
          styles.notificationBadge,
          { transform: [{ scale: badgeScaleAnim }] },
        ]}
      >
        <Text style={styles.notificationBadgeText}>
          {notificationCount > 9 ? "9+" : notificationCount}
        </Text>
      </Animated.View>
    );
  }, [isDashboard, notificationCount, badgeScaleAnim, styles]);

  // Render avatar
  const renderAvatar = useCallback(() => {
    if (!showAvatar && !isDashboard) return null;

    let avatarContent = (
      <Text style={styles.avatarText}>
        {profileName?.charAt(0)?.toUpperCase() ||
          title?.charAt(0)?.toUpperCase() ||
          "L"}
      </Text>
    );

    if (avatarSource) {
      let source = avatarSource;
      if (typeof avatarSource === "string") {
        if (avatarSource.startsWith("http")) {
          source = { uri: avatarSource };
        } else {
          source = { uri: avatarSource };
        }
      }
      avatarContent = <Image source={source} style={styles.avatarImage} />;
    }

    return (
      <View
        style={[
          styles.avatarContainer,
          isDashboard && styles.avatarContainerDashboard,
        ]}
      >
        <View style={[styles.avatar, isDashboard && styles.avatarDashboard]}>
          {avatarContent}
        </View>
      </View>
    );
  }, [showAvatar, isDashboard, avatarSource, profileName, title, styles]);

  // Render dashboard content
  const renderDashboardContent = useCallback(() => {
    if (!isDashboard) return null;

    return (
      <View style={styles.dashboardContent}>
        <View style={styles.dashboardLeft}>
          {renderAvatar()}
          <View style={styles.dashboardInfo}>
            <Text style={styles.dashboardName} numberOfLines={1}>
              {profileName || title || "Advocate"}
            </Text>
            <Text style={styles.dashboardTitle} numberOfLines={1}>
              {subtitle || "LegalSphere Diary"}
            </Text>
          </View>
        </View>
        <View style={styles.dashboardRight}>
          {renderActionButtons()}
          {notificationCount > 0 && renderNotificationBadge()}
          {rightComponent}
        </View>
      </View>
    );
  }, [
    isDashboard,
    renderAvatar,
    renderActionButtons,
    renderNotificationBadge,
    rightComponent,
    profileName,
    title,
    subtitle,
    notificationCount,
    styles,
  ]);

  // Render footer content
  const renderFooter = useCallback(() => {
    if (!footer && !jurisdiction && !profileSubtitle) return null;

    let footerContent = footer;

    if (typeof footerContent === "string") {
      footerContent = <Text style={styles.footerText}>{footerContent}</Text>;
    }

    if (isDashboard && (jurisdiction || profileSubtitle || profileStatus)) {
      const parts = [];
      if (jurisdiction) parts.push(jurisdiction);
      if (profileSubtitle) parts.push(profileSubtitle);
      if (profileStatus) parts.push(profileStatus);

      const footerText = parts.join(" • ");

      footerContent = (
        <Text style={styles.footerText} numberOfLines={2}>
          {footerText}
        </Text>
      );
    }

    if (!footerContent) return null;

    return <View style={styles.footerContainer}>{footerContent}</View>;
  }, [
    footer,
    jurisdiction,
    profileSubtitle,
    profileStatus,
    isDashboard,
    styles,
  ]);

  // Render top row
  const renderTopRow = useCallback(() => {
    if (isDashboard) {
      return renderDashboardContent();
    }

    const showLeft = displayBackButton || showAvatar;

    return (
      <View style={[styles.topRow, isLarge && styles.topRowLarge]}>
        {/* Left */}
        <View
          style={[
            styles.leftContainer,
            !showLeft && styles.leftContainerHidden,
          ]}
        >
          {displayBackButton && (
            <PremiumTouchable
              onPress={handleBackPress}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </PremiumTouchable>
          )}
          {renderAvatar()}
        </View>

        {/* Center */}
        <View style={styles.centerContainer}>
          <Text
            style={[
              styles.titleText,
              loading && styles.titleLoading,
              isLarge && styles.titleTextLarge,
            ]}
            numberOfLines={1}
            accessibilityRole="header"
            accessibilityLabel={title}
          >
            {title}
          </Text>
          {subtitle && !isCompact && !isMinimal ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right */}
        <View style={styles.rightContainer}>
          {rightComponent ? (
            rightComponent
          ) : (
            <View style={styles.actionsContainer}>{renderActionButtons()}</View>
          )}
        </View>
      </View>
    );
  }, [
    isDashboard,
    displayBackButton,
    showAvatar,
    isLarge,
    isCompact,
    isMinimal,
    loading,
    title,
    subtitle,
    renderDashboardContent,
    renderAvatar,
    renderActionButtons,
    rightComponent,
    handleBackPress,
    styles,
  ]);

  // Wrap with BlurView for glass variant
  const headerContent = (
    <Animated.View
      style={[
        styles.headerContainer,
        isGlass && styles.headerContainerGlass,
        isTransparent && styles.headerContainerTransparent,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      {renderTopRow()}

      {children ? (
        <View style={styles.childrenContainer}>{children}</View>
      ) : null}

      {renderFooter()}
    </Animated.View>
  );

  if (isGlass) {
    return (
      <BlurView
        intensity={80}
        tint={resolvedTheme === "dark" ? "dark" : "light"}
        style={styles.blurContainer}
      >
        {headerContent}
      </BlurView>
    );
  }

  return headerContent;
};

const createStyles = (colors, resolvedTheme, insets, computed, isDashboard) => {
  const isDark = resolvedTheme === "dark";
  const isTransparent = computed.isTransparent;
  const isCompact = computed.isCompact;
  const isMinimal = computed.isMinimal;
  const isLarge = computed.isLarge;
  const showDivider = computed.showDivider;
  const showShadow = computed.showShadow;
  const elevationLevel = computed.elevationLevel;

  // Background Theme Tokens
  // Automatically aligns the header background with the central LegalSphere theme
  const headerBgLight = colors.secondary || "#1A73E8";
  const headerBgDark = colors.primary || "#0F2C67";

  let backgroundColor = isDark ? headerBgDark : headerBgLight;
  if (isTransparent) backgroundColor = "transparent";

  // Text Colors
  const textColor = "#FFFFFF";
  const secondaryTextColor = "rgba(255, 255, 255, 0.8)";
  const borderColor = "rgba(255, 255, 255, 0.15)";

  // Elevation - carefully tinted to match the dark blue hue
  let elevationStyles = {};
  if (showShadow && elevationLevel > 0 && !isTransparent && !isMinimal) {
    elevationStyles = {
      shadowColor: isDark ? "#000000" : "#0F2C67",
      shadowOffset: { width: 0, height: elevationLevel * 2 },
      shadowOpacity: isDark ? elevationLevel * 0.15 : elevationLevel * 0.12,
      shadowRadius: elevationLevel * 4,
      elevation: elevationLevel * 2,
    };
  }

  // Divider
  let dividerStyles = {};
  if (showDivider && elevationLevel > 0 && !isTransparent && !isMinimal) {
    dividerStyles = {
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    };
  }

  const paddingTop = isCompact
    ? insets.top + 4
    : isLarge
      ? insets.top + 16
      : insets.top + 10;
  const paddingBottom = isCompact ? 8 : isLarge ? 20 : 16;
  const minHeight = isCompact ? 36 : isLarge ? 56 : 44;

  return StyleSheet.create({
    blurContainer: {
      overflow: "hidden",
      borderBottomLeftRadius:
        elevationLevel > 0 && !isTransparent && !isMinimal ? 24 : 0,
      borderBottomRightRadius:
        elevationLevel > 0 && !isTransparent && !isMinimal ? 24 : 0,
    },

    headerContainer: {
      backgroundColor,
      paddingTop,
      paddingBottom,
      borderBottomLeftRadius:
        elevationLevel > 0 && !isTransparent && !isMinimal ? 24 : 0,
      borderBottomRightRadius:
        elevationLevel > 0 && !isTransparent && !isMinimal ? 24 : 0,
      zIndex: 10,
      ...elevationStyles,
      ...dividerStyles,
    },

    headerContainerGlass: {
      backgroundColor: "transparent",
    },

    headerContainerTransparent: {
      backgroundColor: "transparent",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      minHeight,
    },

    topRowLarge: {
      paddingHorizontal: 20,
      minHeight: 56,
    },

    leftContainer: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 44,
      flexShrink: 0,
    },

    leftContainerHidden: {
      minWidth: 0,
      flex: 0,
    },

    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      flexShrink: 1,
    },

    rightContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      minWidth: 44,
      flexShrink: 0,
    },

    actionsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },

    // Dashboard styles
    dashboardContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      minHeight: 56,
    },

    dashboardLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    dashboardRight: {
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },

    dashboardInfo: {
      marginLeft: 12,
      flex: 1,
    },

    dashboardName: {
      fontSize: typography.sizes.lg || 16,
      fontWeight: typography.weights.bold || "700",
      color: textColor,
    },

    dashboardTitle: {
      fontSize: typography.sizes.sm || 12,
      fontWeight: typography.weights.medium || "500",
      color: secondaryTextColor,
      marginTop: 1,
    },

    notificationBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.danger || "#EF4444",
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: backgroundColor,
      zIndex: 20,
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: typography.sizes.xs || 10,
      fontWeight: typography.weights.bold || "700",
      textAlign: "center",
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.15)", // Premium glass button background
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)", // Thin translucent border
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },

    avatarContainer: {
      marginLeft: 4,
    },

    avatarContainerDashboard: {
      marginLeft: 0,
    },

    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      overflow: "hidden",
    },

    avatarDashboard: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },

    avatarImage: {
      width: "100%",
      height: "100%",
    },

    avatarText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    titleText: {
      fontSize: typography.sizes.xxl || 20,
      fontWeight: typography.weights.bold || "700",
      color: textColor,
      textAlign: "center",
    },

    titleTextLarge: {
      fontSize: typography.sizes.xxxl || 24,
    },

    titleLoading: {
      opacity: 0.5,
    },

    subtitleText: {
      fontSize: typography.sizes.md || 13,
      fontWeight: typography.weights.medium || "500",
      color: secondaryTextColor,
      textAlign: "center",
      marginTop: 2,
    },

    childrenContainer: {
      paddingHorizontal: 16,
      marginTop: 8,
    },

    footerContainer: {
      paddingHorizontal: 16,
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },

    footerText: {
      fontSize: typography.sizes.sm || 12,
      fontWeight: typography.weights.semibold || "600",
      color: secondaryTextColor,
      lineHeight: 20,
    },

    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      marginLeft: 2,
      marginRight: 2,
    },

    actionButtonPrimary: {
      backgroundColor: "rgba(255, 255, 255, 0.15)",
    },

    actionButtonOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },

    actionButtonDisabled: {
      opacity: 0.4,
    },

    badgeContainer: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: colors.danger || "#EF4444",
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor:
        backgroundColor === "transparent"
          ? "rgba(255,255,255,0.2)"
          : backgroundColor,
    },

    badgeText: {
      color: "#FFFFFF",
      fontSize: typography.sizes.xs || 10,
      fontWeight: typography.weights.bold || "700",
      textAlign: "center",
    },
  });
};

export default React.memo(PremiumPageHeader);
