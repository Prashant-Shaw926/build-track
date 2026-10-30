import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@/features/transactions/components/bottom-sheet', () => {
  const { Text } = require('react-native');

  return {
    BottomSheet: ({
      visible,
      title,
      selection,
      children,
    }: {
      visible: boolean;
      title?: string;
      selection?: string;
      children: React.ReactNode;
    }) =>
      visible ? (
        <>
          {title === undefined ? null : <Text>{title}</Text>}
          {selection === undefined ? null : <Text>{selection}</Text>}
          {children}
        </>
      ) : null,
  };
});

import { MonthSelector } from '@/features/transactions/components/month-selector';

describe('MonthSelector', () => {
  const months = ['2026-08', '2026-09', '2026-10'];

  it('selects a month from bottom sheet list when open', async () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    await render(
      <MonthSelector
        months={months}
        selectedMonth="2026-10"
        monthLabel="Oct 2026"
        open={true}
        onOpen={jest.fn()}
        onClose={handleClose}
        onSelect={handleSelect}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    expect(screen.getByText('Months')).toBeTruthy();
    fireEvent.press(screen.getByText('Aug 2026'));
    expect(handleSelect).toHaveBeenCalledWith('2026-08');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders month label and disables edge arrows appropriately', async () => {
    const handlePrevious = jest.fn();
    const handleNext = jest.fn();
    const handleOpen = jest.fn();

    const view = await render(
      <MonthSelector
        months={months}
        selectedMonth="2026-09"
        monthLabel="Sep 2026"
        open={false}
        onOpen={handleOpen}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />,
    );

    expect(screen.getByText('Sep 2026')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(handlePrevious).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Next month'));
    expect(handleNext).toHaveBeenCalledTimes(1);

    await view.rerender(
      <MonthSelector
        months={months}
        selectedMonth="2026-08"
        monthLabel="Aug 2026"
        open={false}
        onOpen={handleOpen}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />,
    );

    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(handlePrevious).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Choose month'));
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});
