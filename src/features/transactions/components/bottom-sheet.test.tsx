import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { BottomSheet } from '@/features/transactions/components/bottom-sheet';

describe('BottomSheet', () => {
  it('renders title, selection, and a close button that calls onClose', async () => {
    const handleClose = jest.fn();

    await render(
      <BottomSheet
        closeLabel="Close filters"
        onClose={handleClose}
        selection="Selected: All categories"
        title="Filters"
        visible>
        <Text>FOOD</Text>
      </BottomSheet>,
    );

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByText('Selected: All categories')).toBeTruthy();
    expect(screen.getByText('FOOD')).toBeTruthy();
    expect(screen.getByText('×')).toBeTruthy();

    fireEvent.press(screen.getByText('×'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('keeps header content beside the close control', async () => {
    await render(
      <BottomSheet
        closeLabel="Close transaction details"
        header={
          <>
            <Text>AMAZON PAY REFUND</Text>
            <Text>₹356.17</Text>
          </>
        }
        onClose={jest.fn()}
        visible>
        <Text>Transaction ID</Text>
      </BottomSheet>,
    );

    expect(screen.getByText('AMAZON PAY REFUND')).toBeTruthy();
    expect(screen.getByText('₹356.17')).toBeTruthy();
    expect(screen.getByLabelText('Close transaction details')).toBeTruthy();
    expect(screen.getByText('Transaction ID')).toBeTruthy();
  });

  it('does not render sheet content when hidden', async () => {
    await render(
      <BottomSheet closeLabel="Close months" onClose={jest.fn()} title="Months" visible={false}>
        <Text>Oct 2026</Text>
      </BottomSheet>,
    );

    expect(screen.queryByText('Months')).toBeNull();
    expect(screen.queryByText('Oct 2026')).toBeNull();
  });
});
