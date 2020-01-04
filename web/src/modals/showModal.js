import React from 'react';
import ReactDOM from 'react-dom';
import useModalState from './useModalState';

function ShowModalComponent({ renderModal, container }) {
  const modalState = useModalState(true);
  if (!modalState.isOpen) {
    container.remove();
  }
  return renderModal(modalState);
}

export default function showModal(renderModal) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<ShowModalComponent renderModal={renderModal} container={container} />, container);
}
