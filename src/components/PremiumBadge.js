import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';

/**
 * A standardized badge component for status, priority, and metadata pills.
 *
 * Variants:
 * - default: subtle primary background with primary text
 * - success: subtle success background with success text
 * - warning: subtle warning background with warning text
 * - danger: subtle danger background with danger text
 * - neutral: subtle surface/border background with secondary text
 */
const PremiumBadge = ({
  label,
  variant = 'default',
  icon,
  style,
  textStyle,
}) => {
  const { colors, resolvedTheme } = useTheme();

  const themeStyles = useMemo(() => {
    let bgColor;
    let textColor;

    switch (variant) {
      case 'success':
        bgColor = resolvedTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)';
        textColor = colors.success;
        break;
      case 'warning':
        bgColor = resolvedTheme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.1)';
        textColor = colors.warning;
        break;
      case 'danger':
        bgColor = resolvedTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.1)';
        textColor = colors.danger;
        break;
      case 'neutral':
        bgColor = resolvedTheme === 'dark' ? colors.border : colors.disabled;
        textColor = colors.secondaryText;
        break;
      case 'default':
      default:
        bgColor = colors.primaryLight;
        textColor = colors.primary;
        break;
    }

    return {
      container: {
        backgroundColor: bgColor,
      },
      text: {
        color: textColor,
      }
    };
  }, [colors, resolvedTheme, variant]);

  return (
    <View style={[styles.container, themeStyles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, themeStyles.text, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});

export default PremiumBadge;
