import React from 'react';
import axios from '../utility/axios';
import ModalBase from './ModalBase';
import { FormRow, FormButton, FormTextField, FormSelectField, FormSubmit } from '../utility/forms';
import { TextField } from '../utility/inputs';
import { Formik, Form } from 'formik';
import SqlEditor from '../sqleditor/SqlEditor';
// import FormikForm from '../utility/FormikForm';
import styled from 'styled-components';

const SqlWrapper = styled.div`
  position: relative;
  height: 30vh;
  width: 40vw;
`;

export default function ConfirmSqlModal({ modalState, sql, engine, onConfirm }) {
  return (
    <ModalBase modalState={modalState}>
      <h2>Save changes</h2>
      <SqlWrapper>
        <SqlEditor value={sql} engine={engine} readOnly />
      </SqlWrapper>

      <FormRow>
        <input
          type="button"
          value="OK"
          onClick={() => {
            modalState.close();
            onConfirm();
          }}
        />
        <input type="button" value="Close" onClick={modalState.close} />
      </FormRow>
    </ModalBase>
  );
}
