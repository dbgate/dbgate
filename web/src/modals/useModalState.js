import React from 'react';

export default function useModalState() {
  const [isOpen, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  const open = () => setOpen(true);
  return { isOpen, open, close };
}
