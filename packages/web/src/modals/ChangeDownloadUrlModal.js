import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormButtonRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import { useSetSavedSqlFiles } from '../utility/globalState';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import FormStyledButton from '../widgets/FormStyledButton';
// import FormikForm from '../utility/FormikForm';

export default function ChangeDownloadUrlModal({ modalState, url = '', onConfirm = undefined }) {
  const textFieldRef = React.useRef(null);
  React.useEffect(() => {
    if (textFieldRef.current) textFieldRef.current.focus();
  }, [textFieldRef.current]);
  const handleSubmit = async (values) => {
    onConfirm(values.url);
    modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Dwonload imported file from web</ModalHeader>
      <Formik onSubmit={handleSubmit} initialValues={{ url }}>
        <Form>
          <ModalContent>
            <FormTextField label="URL" name="url" editorRef={textFieldRef} style={{ width: '30vw' }} />
          </ModalContent>
          <ModalFooter>
            <FormSubmit text="OK" />
            <FormStyledButton value="Cancel" onClick={() => modalState.close()} />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
