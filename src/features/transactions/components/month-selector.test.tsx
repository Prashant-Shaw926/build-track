import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

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
    expect(screen.getByText('Selected: Oct 2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Aug 2026'));
    expect(handleSelect).toHaveBeenCalledWith('2026-08');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('always shows the year next to Jan, Jul, and Aug in the sheet', async () => {
    await render(
      <MonthSelector
        months={['2026-01', '2026-07', '2026-08', '2026-09']}
        selectedMonth="2026-09"
        monthLabel="Sep 2026"
        open={true}
        onOpen={jest.fn()}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Jan 2026')).toBeTruthy();
    expect(screen.getByLabelText('Jul 2026')).toBeTruthy();
    expect(screen.getByLabelText('Aug 2026')).toBeTruthy();
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Jul')).toBeTruthy();
    expect(screen.getByText('Aug')).toBeTruthy();
    expect(screen.getAllByText('2026').length).toBeGreaterThanOrEqual(3);
  });

  it('closes the months sheet from the close button', async () => {
    const handleClose = jest.fn();

    await render(
      <MonthSelector
        months={months}
        selectedMonth="2026-10"
        monthLabel="Oct 2026"
        open={true}
        onOpen={jest.fn()}
        onClose={handleClose}
        onSelect={jest.fn()}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Close months'));
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
