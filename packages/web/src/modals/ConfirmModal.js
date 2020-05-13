import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';

export default function ConfirmModal({ message, modalState, onConfirm }) {
  return (
    <ModalBase modalState={modalState}>
      <ModalContent>{message}</ModalContent>

      <ModalFooter>
        <FormStyledButton
          value="OK"
          onClick={() => {
            modalState.close();
            onConfirm();
          }}
        />
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </ModalFooter>
    </ModalBase>
  );
}
