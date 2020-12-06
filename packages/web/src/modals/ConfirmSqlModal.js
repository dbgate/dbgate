import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import SqlEditor from '../sqleditor/SqlEditor';
import styled from 'styled-components';
import keycodes from '../utility/keycodes';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';

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
      <ModalHeader modalState={modalState}>Save changes</ModalHeader>
      <ModalContent>
        <SqlWrapper>
          <SqlEditor value={sql} engine={engine} focusOnCreate onKeyDown={handleKeyDown} readOnly />
        </SqlWrapper>
      </ModalContent>

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
