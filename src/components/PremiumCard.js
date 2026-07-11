import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import PremiumTouchable from './PremiumTouchable';

const PremiumCard = ({
  children,
  style,
  onPress,
  elevationLevel = 1,
  disabled = false,
  ...rest
}) => {
  const { colors, resolvedTheme } = useTheme();

  const cardStyle = useMemo(() => {
    let elevationStyle = {};

    if (resolvedTheme === 'light') {
      switch (elevationLevel) {
        case 0: // Flat
          elevationStyle = {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          };
          break;
        case 1: // Low
          elevationStyle = {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          };
          break;
        case 2: // Medium
          elevationStyle = {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          };
          break;
        case 3: // High
          elevationStyle = {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
          };
          break;
        default:
          elevationStyle = {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          };
      }
    } else {
      // Dark mode: rely purely on borders and surface color, no shadows
      elevationStyle = {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: elevationLevel > 0 ? colors.border : 'transparent',
      };
    }

    return [styles.container, elevationStyle, style];
  }, [colors, resolvedTheme, elevationLevel, style]);

  if (onPress) {
    return (
      <PremiumTouchable
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        {...rest}
      >
        {children}
      </PremiumTouchable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default PremiumCard;
