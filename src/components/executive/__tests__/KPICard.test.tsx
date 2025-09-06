import React from 'react';
import { render } from '@testing-library/react-native';
import { KPICard } from '../KPICard';

describe('KPICard', () => {
  it('should render with required props', () => {
    const { getByText } = render(
      <KPICard title="Revenue" value={50000} />
    );
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('50,000')).toBeTruthy();
  });

  it('should format currency values correctly', () => {
    const { getByText } = render(
      <KPICard title="Sales" value={1234.56} format="currency" />
    );
    expect(getByText('$1,234.56')).toBeTruthy();
  });

  it('should format percent values correctly', () => {
    const { getByText } = render(
      <KPICard title="Growth" value={25.5} format="percent" />
    );
    expect(getByText('25.5%')).toBeTruthy();
  });

  it('should display trend indicator when provided', () => {
    const { getByTestId } = render(
      <KPICard 
        title="Growth" 
        value={100}
        trend={{ direction: 'up', value: 15 }}
      />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
  });

  it('should display comparison text when provided', () => {
    const { getByText } = render(
      <KPICard 
        title="Orders" 
        value={150}
        comparison={{ value: 25, label: 'last week' }}
      />
    );
    expect(getByText('+25 vs last week')).toBeTruthy();
  });

  it('should have proper accessibility labels', () => {
    const { getByLabelText } = render(
      <KPICard title="Revenue" value={50000} format="currency" />
    );
    expect(getByLabelText('Revenue KPI: $50,000.00')).toBeTruthy();
  });
});