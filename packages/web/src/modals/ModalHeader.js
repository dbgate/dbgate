import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 15pt;
  padding: 15px;
  display: flex;
  justify-content: space-between;
`;

const CloseWrapper = styled.div`
  font-size: 12pt;
  &:hover {
    background-color: #blue;
  }
`;

export default function ModalHeader({ children, modalState }) {
  return (
    <Wrapper>
      <div>{children}</div>
      <CloseWrapper onClick={modalState.close}>
        <i className="fas fa-times" />
      </CloseWrapper>
    </Wrapper>
  );
}
