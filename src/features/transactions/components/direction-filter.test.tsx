import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DirectionFilterControl } from '@/features/transactions/components/direction-filter';

describe('DirectionFilterControl', () => {
  const counts = { all: 10, debit: 7, credit: 3 };

  it('renders options with direction counts and handles selection', async () => {
    const handleChange = jest.fn();
    const { getByText } = await render(
      <DirectionFilterControl counts={counts} direction="all" onChange={handleChange} />
    );

    expect(getByText('All')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();

    fireEvent.press(getByText('Income'));
    expect(handleChange).toHaveBeenCalledWith('credit');

    fireEvent.press(getByText('Expense'));
    expect(handleChange).toHaveBeenCalledWith('debit');
  });
});
