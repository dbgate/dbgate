import React from 'react';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit, FormButton } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider } from '../utility/FormProvider';

export default function InputTextModal({ header, label, value, modalState, onConfirm }) {
  const handleSubmit = async (values) => {
    const { value } = values;
    modalState.close();
    onConfirm(value);
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{header}</ModalHeader>
      <FormProvider initialValues={{ value }}>
        <ModalContent>
          <FormTextField label={label} name="value" focused />
        </ModalContent>
        <ModalFooter>
          <FormButton value="Cancel" onClick={() => modalState.close()} />
          <FormSubmit value="OK" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
