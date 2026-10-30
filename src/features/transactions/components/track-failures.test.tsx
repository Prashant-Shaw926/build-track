import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TrackFailures } from '@/features/transactions/components/track-failures';
import type { TrackFailure } from '@/features/transactions/utils/track-month';

describe('TrackFailures', () => {
  it('renders nothing when failures array is empty', async () => {
    const { toJSON } = await render(<TrackFailures failures={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders summary and toggles details on press', async () => {
    const failures: TrackFailure[] = [
      { id: 'txn_bad_1', index: 0, reason: 'invalid_amount' },
      { id: 'txn_bad_2', index: 1, reason: 'invalid_timestamp' },
    ];
    const { getByRole, getByText, queryByText } = await render(<TrackFailures failures={failures} />);

    expect(getByText('2 transactions could not be read')).toBeTruthy();
    expect(getByText('Show details')).toBeTruthy();
    expect(queryByText(/txn_bad_1/)).toBeNull();

    // Toggle expand
    await fireEvent.press(getByRole('button'));
    expect(getByText('Hide details')).toBeTruthy();
    expect(getByText('txn_bad_1 · invalid_amount')).toBeTruthy();
    expect(getByText('txn_bad_2 · invalid_timestamp')).toBeTruthy();
  });
});
