import React from 'react';
import { View, RNText as RNRNText, StyleSheet, TouchableOpacity } from 'react-native';
import { useRealtimeStatusDisplay } from '../../hooks/useUnifiedRealtime';

interface RealtimeStatusIndicatorProps {
  showDetails?: boolean;
  onPress?: () => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  showDetails = false,
  onPress,
  style,
  size = 'medium',
}) => {
  const status = useRealtimeStatusDisplay();

  const dotSize = size === 'small' ? 6 : size === 'large' ? 10 : 8;
  const fontSize = size === 'small' ? 10 : size === 'large' ? 14 : 12;

  const containerStyle = [
    styles.container,
    onPress && styles.touchable,
    style,
  ];

  const content = (
    <View style={containerStyle}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: status.color
            }
          ]}
        />
        <RNText style={[styles.statusRNText, { fontSize }]}>
          {status.text}
        </RNText>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <RNText style={[styles.detailsRNText, { fontSize: fontSize - 1 }]}>
            {status.details}
          </RNText>
          {status.metrics.connectedSince && (
            <RNText style={[styles.metricsRNText, { fontSize: fontSize - 2 }]}>
              Connected: {status.metrics.connectedSince.toLocaleTimeString()}
            </RNText>
          )}
          {status.metrics.messagesReceived > 0 && (
            <RNText style={[styles.metricsRNText, { fontSize: fontSize - 2 }]}>
              Messages: {status.metrics.messagesReceived}
            </RNText>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  touchable: {
    borderRadius: 8,
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    marginRight: 6,
  },
  statusRNText: {
    color: '#666',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 4,
    paddingLeft: 14,
  },
  detailsRNText: {
    color: '#888',
    marginBottom: 2,
  },
  metricsRNText: {
    color: '#999',
    marginBottom: 1,
  },
});