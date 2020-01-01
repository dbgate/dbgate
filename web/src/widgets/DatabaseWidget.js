import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';

export default function DatabaseWidget() {
  const modalState = useModalState();
  return (
    <>
      <ConnectionModal modalState={modalState} />
      <button onClick={modalState.open}>Add connection</button>
    </>
  );
}
