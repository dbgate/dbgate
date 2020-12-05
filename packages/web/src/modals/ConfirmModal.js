import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import { FormSubmit } from '../utility/forms';
import { FormProvider } from '../utility/FormProvider';

export default function ConfirmModal({ message, modalState, onConfirm }) {
  return (
    <FormProvider>
      <ModalBase modalState={modalState}>
        <ModalContent>{message}</ModalContent>

        <ModalFooter>
          <FormSubmit
            value="OK"
            onClick={() => {
              modalState.close();
              onConfirm();
            }}
          />
          <FormStyledButton type="button" value="Close" onClick={modalState.close} />
        </ModalFooter>
      </ModalBase>
    </FormProvider>
  );
}
