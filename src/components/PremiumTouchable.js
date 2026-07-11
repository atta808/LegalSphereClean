import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Platform, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * PremiumTouchable
 * A standardized interactive component providing a subtle scale down animation on press,
 * with a smooth spring release. Replaces TouchableOpacity for a premium feel.
 */
export default function PremiumTouchable({
  children,
  onPress,
  disabled = false,
  style,
  scaleTo = 0.96,
  activeOpacity = 1,
  showHighlight = false,
  ...rest
}) {
  const { colors, resolvedTheme } = useTheme();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const highlight = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    scale.value = withSpring(scaleTo, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });

    if (activeOpacity < 1) {
      opacity.value = withTiming(activeOpacity, { duration: 100 });
    }

    if (showHighlight) {
      highlight.value = withTiming(1, { duration: 150 });
    }
  }, [disabled, scaleTo, activeOpacity, showHighlight, scale, opacity, highlight]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 250,
      mass: 0.5,
    });

    if (activeOpacity < 1) {
      opacity.value = withTiming(1, { duration: 150 });
    }

    if (showHighlight) {
      highlight.value = withTiming(0, { duration: 250 });
    }
  }, [disabled, activeOpacity, showHighlight, scale, opacity, highlight]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseStyle = {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };

    if (showHighlight) {
      // Very subtle highlight color based on theme
      const highlightColor = resolvedTheme === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.03)';

      return {
        ...baseStyle,
        backgroundColor: interpolateColor(
          highlight.value,
          [0, 1],
          ['transparent', highlightColor]
        ),
      };
    }

    return baseStyle;
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        disabled && styles.disabled,
        animatedStyle,
        style
      ]}
      android_ripple={{
        color: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderless: false,
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  }
});
