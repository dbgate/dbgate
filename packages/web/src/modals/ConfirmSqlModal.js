import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormRow, FormButtonRow, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import FormStyledButton from '../widgets/FormStyledButton';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import SqlEditor from '../sqleditor/SqlEditor';
// import FormikForm from '../utility/FormikForm';
import styled from 'styled-components';
import keycodes from '../utility/keycodes';

const SqlWrapper = styled.div`
  position: relative;
  height: 30vh;
  width: 40vw;
`;

export default function ConfirmSqlModal({ modalState, sql, engine, onConfirm }) {
  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.enter) {
      event.preventDefault();
      modalState.close();
      onConfirm();
    }
  };
  return (
    <ModalBase modalState={modalState}>
      <h2>Save changes</h2>
      <SqlWrapper>
        <SqlEditor value={sql} engine={engine} focusOnCreate onKeyDown={handleKeyDown} readOnly />
      </SqlWrapper>

      <FormButtonRow>
        <FormStyledButton
          value="OK"
          onClick={() => {
            modalState.close();
            onConfirm();
          }}
        />
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </FormButtonRow>
    </ModalBase>
  );
}
