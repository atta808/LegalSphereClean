import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import PremiumButton from './PremiumButton';

/**
 * EmptyState component for lists without data.
 */
const EmptyState = ({
  icon,
  title,
  description,
  primaryActionTitle,
  onPrimaryAction,
  secondaryActionTitle,
  onSecondaryAction,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {description && (
        <Text style={[styles.description, { color: colors.secondaryText }]}>
          {description}
        </Text>
      )}

      {primaryActionTitle && onPrimaryAction && (
        <PremiumButton
          title={primaryActionTitle}
          onPress={onPrimaryAction}
          style={styles.primaryButton}
          fullWidth={false}
        />
      )}

      {secondaryActionTitle && onSecondaryAction && (
        <PremiumButton
          title={secondaryActionTitle}
          onPress={onSecondaryAction}
          variant="ghost"
          style={styles.secondaryButton}
          fullWidth={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.lineHeights.md,
    maxWidth: 280,
  },
  primaryButton: {
    minWidth: 200,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    minWidth: 200,
  },
});

export default EmptyState;
