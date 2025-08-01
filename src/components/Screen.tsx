import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../utils/theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  padding = true,
  backgroundColor = colors.background,
  style,
}) => {
  const containerStyle = [
    styles.container,
    { backgroundColor },
    padding && styles.padding,
    style,
  ];

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView style={containerStyle}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
