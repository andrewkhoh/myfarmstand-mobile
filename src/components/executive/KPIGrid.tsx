import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { KPICard, KPICardProps } from './KPICard';

export interface KPIGridProps {
  cards: KPICardProps[];
  columns?: number;
  scrollable?: boolean;
  testID?: string;
}

export const KPIGrid = React.memo<KPIGridProps>(({
  cards,
  columns = 2,
  scrollable = false,
  testID = 'kpi-grid'
}) => {
  const screenWidth = Dimensions.get('window').width;
  
  const cardWidth = useMemo(() => {
    const totalPadding = 16 * 2 + (columns - 1) * 8;
    return (screenWidth - totalPadding) / columns;
  }, [screenWidth, columns]);

  const renderCards = useMemo(() => {
    return cards.map((card, index) => (
      <View 
        key={`kpi-card-${index}`} 
        style={[styles.cardWrapper, { width: cardWidth }]}
      >
        <KPICard {...card} testID={`${testID}-card-${index}`} />
      </View>
    ));
  }, [cards, cardWidth, testID]);

  const content = (
    <View style={styles.grid} testID={testID}>
      {renderCards}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView 
        horizontal={false} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
});

KPIGrid.displayName = 'KPIGrid';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  scrollContainer: {
    paddingVertical: 8
  },
  cardWrapper: {
    marginBottom: 8
  }
});