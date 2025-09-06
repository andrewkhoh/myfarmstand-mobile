import React from 'react';
import { render } from '@testing-library/react-native';
import { KPISummary, KPIMetric } from '../KPISummary';

describe('KPISummary', () => {
  const mockMetrics: KPIMetric[] = [
    { label: 'Revenue', value: 50000, format: 'currency' },
    { label: 'Orders', value: 150 },
    { label: 'Growth', value: 15.5, format: 'percent', trend: 'up' },
    { label: 'Users', value: 125000, format: 'compact' }
  ];

  it('should render all metrics', () => {
    const { getByText } = render(
      <KPISummary metrics={mockMetrics} />
    );
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('Orders')).toBeTruthy();
    expect(getByText('Growth')).toBeTruthy();
    expect(getByText('Users')).toBeTruthy();
  });

  it('should render with title', () => {
    const { getByText } = render(
      <KPISummary title="Key Metrics" metrics={mockMetrics} />
    );
    expect(getByText('Key Metrics')).toBeTruthy();
  });

  it('should format values correctly', () => {
    const { getByText } = render(
      <KPISummary metrics={mockMetrics} />
    );
    expect(getByText('$50,000.00')).toBeTruthy();
    expect(getByText('150')).toBeTruthy();
    expect(getByText('15.5%')).toBeTruthy();
    expect(getByText('125K')).toBeTruthy();
  });

  it('should render in horizontal mode', () => {
    const { getByTestId } = render(
      <KPISummary metrics={mockMetrics} horizontal={true} />
    );
    expect(getByTestId('kpi-summary')).toBeTruthy();
  });

  it('should render in compact mode', () => {
    const { getByTestId } = render(
      <KPISummary metrics={mockMetrics} compact={true} />
    );
    expect(getByTestId('kpi-summary')).toBeTruthy();
  });
});