import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import { FormButtonRow } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';

const Wrapper = styled.div`
display:flex
align-items:center
`;

const IconWrapper = styled.div`
  margin-right: 10px;
  font-size: 20pt;
`;

export default function ErrorMessageModal({ modalState, title = 'Error', message }) {
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{title}</ModalHeader>
      <ModalContent>
        <Wrapper>
          <IconWrapper>
            <FontIcon icon="fas fa-times-circle red" />
          </IconWrapper>
          {message}
        </Wrapper>
      </ModalContent>
      <ModalFooter>
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </ModalFooter>
    </ModalBase>
  );
}
