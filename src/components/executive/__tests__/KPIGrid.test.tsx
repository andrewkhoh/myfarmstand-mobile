import React from 'react';
import { render } from '@testing-library/react-native';
import { KPIGrid } from '../KPIGrid';
import { KPICardProps } from '../KPICard';

describe('KPIGrid', () => {
  const mockCards: KPICardProps[] = [
    { title: 'Revenue', value: 50000, format: 'currency' },
    { title: 'Orders', value: 150 },
    { title: 'Growth', value: 15.5, format: 'percent' },
    { title: 'Customers', value: 1250 }
  ];

  it('should render all KPI cards', () => {
    const { getByText } = render(
      <KPIGrid cards={mockCards} />
    );
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('Orders')).toBeTruthy();
    expect(getByText('Growth')).toBeTruthy();
    expect(getByText('Customers')).toBeTruthy();
  });

  it('should render with custom column count', () => {
    const { getByTestId } = render(
      <KPIGrid cards={mockCards} columns={3} />
    );
    const grid = getByTestId('kpi-grid');
    expect(grid).toBeTruthy();
  });

  it('should render in scrollable mode', () => {
    const { getByTestId } = render(
      <KPIGrid cards={mockCards} scrollable={true} />
    );
    expect(getByTestId('kpi-grid')).toBeTruthy();
  });

  it('should assign unique test IDs to cards', () => {
    const { getByTestId } = render(
      <KPIGrid cards={mockCards} />
    );
    expect(getByTestId('kpi-grid-card-0')).toBeTruthy();
    expect(getByTestId('kpi-grid-card-1')).toBeTruthy();
  });

  it('should handle empty cards array', () => {
    const { getByTestId } = render(
      <KPIGrid cards={[]} />
    );
    expect(getByTestId('kpi-grid')).toBeTruthy();
  });
});