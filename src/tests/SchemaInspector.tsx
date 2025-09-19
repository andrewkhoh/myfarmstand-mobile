import React, { useState } from 'react';
import { View, Text as RNText, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../config/supabase';
import { colors, spacing } from '../utils/theme';

const SchemaInspector: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const inspectSchema = async () => {
    setIsLoading(true);
    setResults('Inspecting database schema...\n\n');

    try {
      const tables = [
        'products', 
        'categories', 
        'orders', 
        'order_items', 
        'cart_items',
        'users',
        'error_recovery_log',
        'notification_log', 
        'pickup_reschedule_log',
        'no_show_log',
        'inventory_logs'
      ];
      let schemaInfo = '';

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            schemaInfo += `❌ ${table.toUpperCase()}: Error - ${error.message}\n\n`;
          } else if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            schemaInfo += `✅ ${table.toUpperCase()} TABLE COLUMNS:\n`;
            columns.forEach(col => {
              schemaInfo += `  • ${col}\n`;
            });
            schemaInfo += '\n';
          } else {
            schemaInfo += `⚠️ ${table.toUpperCase()}: No data found\n\n`;
          }
        } catch (err) {
          schemaInfo += `❌ ${table.toUpperCase()}: Exception - ${err}\n\n`;
        }
      }

      setResults(schemaInfo);
    } catch (error) {
      setResults(`Error inspecting schema: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <RNText style={styles.title}>Database Schema Inspector</RNText>
        <RNText style={styles.subtitle}>
          Inspect actual database table columns to fix schema mismatches
        </RNText>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={inspectSchema}
          disabled={isLoading}
        >
          <RNText style={styles.buttonRNText}>
            {isLoading ? 'Inspecting...' : 'Inspect Database Schema'}
          </RNText>
        </TouchableOpacity>

        {results ? (
          <View style={styles.resultsContainer}>
            <RNText style={styles.resultsTitle}>Schema Results:</RNText>
            <View style={styles.resultsBox}>
              <RNText style={styles.resultsRNText}>{results}</RNText>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[400],
  },
  buttonRNText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  resultsContainer: {
    marginTop: spacing.lg,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  resultsBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  resultsRNText: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default SchemaInspector;
