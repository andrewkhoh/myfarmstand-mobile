import React from 'react';
import { render } from '@testing-library/react-native';
import { KPIComparison } from '../KPIComparison';

describe('KPIComparison', () => {
  const defaultProps = {
    title: 'Revenue Comparison',
    current: { value: 50000, label: 'This Month' },
    previous: { value: 45000, label: 'Last Month' }
  };

  it('should render with required props', () => {
    const { getByText } = render(
      <KPIComparison {...defaultProps} />
    );
    expect(getByText('Revenue Comparison')).toBeTruthy();
    expect(getByText('This Month')).toBeTruthy();
    expect(getByText('Last Month')).toBeTruthy();
  });

  it('should format currency values correctly', () => {
    const { getByText } = render(
      <KPIComparison {...defaultProps} format="currency" />
    );
    expect(getByText('$50,000.00')).toBeTruthy();
    expect(getByText('$45,000.00')).toBeTruthy();
  });

  it('should calculate and display trend', () => {
    const { getByTestId, getByText } = render(
      <KPIComparison {...defaultProps} />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
    expect(getByText(/\+5,000/)).toBeTruthy();
  });

  it('should show down trend for negative change', () => {
    const { getByTestId } = render(
      <KPIComparison 
        {...defaultProps}
        current={{ value: 40000, label: 'This Month' }}
      />
    );
    expect(getByTestId('trend-down')).toBeTruthy();
  });

  it('should hide trend when showTrend is false', () => {
    const { queryByTestId } = render(
      <KPIComparison {...defaultProps} showTrend={false} />
    );
    expect(queryByTestId('trend-up')).toBeNull();
  });
});