import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import PremiumCard from './PremiumCard';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';

/**
 * Skeleton Loader Component
 * Replaces ActivityIndicator with structural loading states mimicking content.
 *
 * Variants:
 * - list: Mimics a standard list item / card (avatar + text rows).
 * - card: Mimics a large dashboard card.
 */
const SkeletonLoader = ({
  variant = 'list', // 'list', 'card'
  count = 3,
  style
}) => {
  const { colors, resolvedTheme } = useTheme();

  // Base skeleton color derived from theme
  const skeletonColor = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Animation value
  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [fadeAnim]);

  const renderListItem = (key) => (
    <PremiumCard key={key} style={[styles.listItem, style]} elevationLevel={0}>
      <Animated.View style={{ opacity: fadeAnim, flexDirection: 'row', alignItems: 'center' }}>
        {/* Avatar Placeholder */}
        <View style={[styles.avatar, { backgroundColor: skeletonColor }]} />

        {/* Text Lines Placeholders */}
        <View style={styles.textContainer}>
          <View style={[styles.titleLine, { backgroundColor: skeletonColor }]} />
          <View style={[styles.subLine, { backgroundColor: skeletonColor }]} />
        </View>
      </Animated.View>
    </PremiumCard>
  );

  const renderCardItem = (key) => (
    <PremiumCard key={key} style={[styles.dashboardCard, style]} elevationLevel={1}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.cardHeader, { backgroundColor: skeletonColor }]} />
        <View style={[styles.cardBody1, { backgroundColor: skeletonColor }]} />
        <View style={[styles.cardBody2, { backgroundColor: skeletonColor }]} />
      </Animated.View>
    </PremiumCard>
  );

  const renderContent = () => {
    const items = [];
    for (let i = 0; i < count; i++) {
      if (variant === 'list') {
        items.push(renderListItem(i));
      } else {
        items.push(renderCardItem(i));
      }
    }
    return items;
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  listItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    width: '70%',
    height: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  subLine: {
    width: '40%',
    height: 12,
    borderRadius: radius.sm,
  },
  dashboardCard: {
    height: 140,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    width: '50%',
    height: 20,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  cardBody1: {
    width: '100%',
    height: 14,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  cardBody2: {
    width: '80%',
    height: 14,
    borderRadius: radius.sm,
  }
});

export default SkeletonLoader;
