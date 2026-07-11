import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import PremiumTouchable from './PremiumTouchable';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';

/**
 * Standardized Premium Button
 *
 * Variants:
 * - primary: Solid primary color, contrasting text.
 * - secondary: Subtle surface color, primary text.
 * - danger: Solid danger color, contrasting text.
 * - outline: Transparent background, primary border and text.
 * - ghost: Transparent background, primary text, no border.
 */
const PremiumButton = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  style,
  textStyle,
  disabled = false,
  loading = false,
  fullWidth = true,
  size = 'md', // 'sm', 'md', 'lg'
}) => {
  const { colors } = useTheme();

  const themeStyles = useMemo(() => {
    let bgColor = 'transparent';
    let textColor = colors.text;
    let borderColor = 'transparent';

    switch (variant) {
      case 'primary':
        bgColor = colors.primary;
        textColor = '#FFFFFF';
        break;
      case 'secondary':
        bgColor = colors.primaryLight;
        textColor = colors.primary;
        break;
      case 'danger':
        bgColor = colors.danger;
        textColor = '#FFFFFF';
        break;
      case 'outline':
        borderColor = colors.primary;
        textColor = colors.primary;
        break;
      case 'ghost':
        textColor = colors.primary;
        break;
    }

    if (disabled && variant !== 'ghost' && variant !== 'outline') {
      bgColor = colors.disabled;
      textColor = colors.disabledText;
    } else if (disabled) {
      textColor = colors.disabledText;
      borderColor = colors.disabledText;
    }

    return {
      container: {
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: variant === 'outline' ? 1 : 0,
      },
      text: {
        color: textColor,
      },
      iconColor: textColor,
    };
  }, [colors, variant, disabled]);

  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: typography.sizes.sm };
      case 'lg':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: typography.sizes.lg };
      case 'md':
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: typography.sizes.md };
    }
  }, [size]);

  return (
    <PremiumTouchable
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        themeStyles.container,
        { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={themeStyles.iconColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && (
            <View style={[styles.iconLeft, { marginRight: title ? spacing.sm : 0 }]}>
              {icon(themeStyles.iconColor)}
            </View>
          )}

          {title && (
            <Text style={[styles.text, { fontSize: sizeStyles.fontSize }, themeStyles.text, textStyle]}>
              {title}
            </Text>
          )}

          {iconRight && (
            <View style={[styles.iconRight, { marginLeft: title ? spacing.sm : 0 }]}>
              {iconRight(themeStyles.iconColor)}
            </View>
          )}
        </View>
      )}
    </PremiumTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  iconLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default PremiumButton;
