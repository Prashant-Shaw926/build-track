import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/features/transactions/components/bottom-sheet', () => {
  const { Pressable, Text } = require('react-native');

  return {
    BottomSheet: ({
      visible,
      title,
      selection,
      closeLabel,
      onClose,
      children,
    }: {
      visible: boolean;
      title?: string;
      selection?: string;
      closeLabel: string;
      onClose: () => void;
      children: React.ReactNode;
    }) =>
      visible ? (
        <>
          {title === undefined ? null : <Text>{title}</Text>}
          {selection === undefined ? null : <Text>{selection}</Text>}
          <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose}>
            <Text>×</Text>
          </Pressable>
          {children}
        </>
      ) : null,
  };
});

import { TransactionControls } from '@/features/transactions/components/transaction-controls';

const choices = [
  { filter: { type: 'all' as const }, label: 'All categories' },
  { filter: { type: 'category' as const, value: 'FOOD' }, label: 'FOOD' },
];
const directionCounts = { all: 10, debit: 6, credit: 4 };

function renderControls(
  overrides: Partial<React.ComponentProps<typeof TransactionControls>> = {},
) {
  return render(
    <TransactionControls
      query=""
      category={{ type: 'all' }}
      sort="source"
      direction="all"
      directionCounts={directionCounts}
      choices={choices}
      onQueryChange={jest.fn()}
      onCategoryChange={jest.fn()}
      onSortChange={jest.fn()}
      onDirectionChange={jest.fn()}
      {...overrides}
    />,
  );
}

describe('TransactionControls', () => {
  it('updates the merchant search query', async () => {
    const handleQueryChange = jest.fn();
    await renderControls({ onQueryChange: handleQueryChange });

    fireEvent.changeText(screen.getByPlaceholderText('Search merchants'), 'Swiggy');
    expect(handleQueryChange).toHaveBeenCalledWith('Swiggy');
  });

  it('selects a category from the filters sheet', async () => {
    const handleCategoryChange = jest.fn();
    await renderControls({ onCategoryChange: handleCategoryChange });

    fireEvent.press(screen.getByText('All categories'));
    expect(await screen.findByText('Filters')).toBeTruthy();
    expect(screen.getByText('Selected: All categories')).toBeTruthy();
    fireEvent.press(await screen.findByText('FOOD'));
    expect(handleCategoryChange).toHaveBeenCalledWith({ type: 'category', value: 'FOOD' });
    await waitFor(() => {
      expect(screen.queryByText('Filters')).toBeNull();
    });
  });

  it('closes the filters sheet from the close button', async () => {
    await renderControls();

    fireEvent.press(screen.getByText('All categories'));
    fireEvent.press(await screen.findByLabelText('Close filters'));
    await waitFor(() => {
      expect(screen.queryByText('Filters')).toBeNull();
    });
  });

  it('selects a sort option from the sort sheet', async () => {
    const handleSortChange = jest.fn();
    await renderControls({ onSortChange: handleSortChange });

    fireEvent.press(screen.getByText('Default order'));
    expect(await screen.findByText('Sort')).toBeTruthy();
    expect(screen.getByText('Selected: Default order')).toBeTruthy();
    fireEvent.press(await screen.findByText('Highest amount'));
    expect(handleSortChange).toHaveBeenCalledWith('amount-desc');
    await waitFor(() => {
      expect(screen.queryByText('Sort')).toBeNull();
    });
  });

  it('closes the sort sheet from the close button', async () => {
    await renderControls();

    fireEvent.press(screen.getByText('Default order'));
    fireEvent.press(await screen.findByLabelText('Close sort'));
    await waitFor(() => {
      expect(screen.queryByText('Sort')).toBeNull();
    });
  });
});
