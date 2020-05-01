import React from 'react';
import ModalBase from './ModalBase';
import { FormButtonRow } from '../utility/forms';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';

const MessageWrapper = styled.div`
  margin: 20px;
`;

export default function ConfirmModal({ message, modalState, onConfirm }) {
  return (
    <ModalBase modalState={modalState}>
      <MessageWrapper>{message}</MessageWrapper>

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
