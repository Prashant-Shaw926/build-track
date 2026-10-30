import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TrackStatus } from '@/features/transactions/components/track-status';

describe('TrackStatus', () => {
  it('renders title and message', async () => {
    const { getByText } = await render(
      <TrackStatus title="Transactions unavailable" message="Network error occurred" />
    );
    expect(getByText('Transactions unavailable')).toBeTruthy();
    expect(getByText('Network error occurred')).toBeTruthy();
  });

  it('renders action button and handles press', async () => {
    const handleAction = jest.fn();
    const { getByText } = await render(
      <TrackStatus title="Error" actionLabel="Retry" onAction={handleAction} />
    );
    const button = getByText('Retry');
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
