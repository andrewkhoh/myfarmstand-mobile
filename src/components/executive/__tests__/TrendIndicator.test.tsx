import React from 'react';
import { render } from '@testing-library/react-native';
import { TrendIndicator } from '../TrendIndicator';

describe('TrendIndicator', () => {
  it('should render up trend indicator', () => {
    const { getByTestId } = render(
      <TrendIndicator direction="up" />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
  });

  it('should render down trend indicator', () => {
    const { getByTestId } = render(
      <TrendIndicator direction="down" />
    );
    expect(getByTestId('trend-down')).toBeTruthy();
  });

  it('should render stable trend indicator', () => {
    const { getByTestId } = render(
      <TrendIndicator direction="stable" />
    );
    expect(getByTestId('trend-stable')).toBeTruthy();
  });

  it('should render with custom color', () => {
    const { getByTestId } = render(
      <TrendIndicator direction="up" color="#ff0000" />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
  });

  it('should render with custom size', () => {
    const { getByTestId } = render(
      <TrendIndicator direction="up" size={24} />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
  });
});