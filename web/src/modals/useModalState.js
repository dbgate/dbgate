import React from 'react';

export default function useModalState(isOpenDefault = false) {
  const [isOpen, setOpen] = React.useState(isOpenDefault);
  const close = () => setOpen(false);
  const open = () => setOpen(true);
  return { isOpen, open, close };
}
