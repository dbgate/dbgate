import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';

const Wrapper = styled.div`
  font-size: 15pt;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  background-color: #eeffff;
`;

const CloseWrapper = styled.div`
  font-size: 12pt;
  &:hover {
    background-color: #ccccff;
  }
  padding: 5px 10px;
  border-radius: 10px; 
`;

export default function ModalHeader({ children, modalState }) {
  return (
    <Wrapper>
      <div>{children}</div>
      <CloseWrapper onClick={modalState.close}>
        <FontIcon icon="mdi mdi-close" />
      </CloseWrapper>
    </Wrapper>
  );
}
