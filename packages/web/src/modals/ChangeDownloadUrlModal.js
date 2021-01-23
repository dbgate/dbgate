import React from 'react';
import ModalBase from './ModalBase';
import { FormButton, FormSubmit, FormTextField } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import FormStyledButton from '../widgets/FormStyledButton';
import { FormProvider } from '../utility/FormProvider';

export default function ChangeDownloadUrlModal({ modalState, url = '', onConfirm = undefined }) {
  // const textFieldRef = React.useRef(null);
  // React.useEffect(() => {
  //   if (textFieldRef.current) textFieldRef.current.focus();
  // }, [textFieldRef.current]);

  // const handleSubmit = () => async (values) => {
  //   onConfirm(values.url);
  //   modalState.close();
  // };

  const handleSubmit = React.useCallback(
    async values => {
      onConfirm(values.url);
      modalState.close();
    },
    [modalState, onConfirm]
  );
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Download imported file from web</ModalHeader>
      <FormProvider initialValues={{ url }}>
        <ModalContent>
          <FormTextField label="URL" name="url" style={{ width: '30vw' }} focused />
        </ModalContent>
        <ModalFooter>
          <FormSubmit value="OK" onClick={handleSubmit} />
          <FormStyledButton value="Cancel" onClick={() => modalState.close()} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
