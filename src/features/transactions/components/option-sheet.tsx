import { type ReactNode } from 'react';

import { BottomSheet } from '@/features/transactions/components/bottom-sheet';

interface OptionSheetProps {
  title: string;
  selection?: string;
  open: boolean;
  closeLabel: string;
  onClose: () => void;
  note?: string;
  children: ReactNode;
}

export function OptionSheet({ title, selection, open, closeLabel, onClose, note, children }: OptionSheetProps) {
  return (
    <BottomSheet
      closeLabel={closeLabel}
      maxHeight="60%"
      note={note}
      onClose={onClose}
      selection={selection}
      title={title}
      visible={open}>
      {children}
    </BottomSheet>
  );
}
