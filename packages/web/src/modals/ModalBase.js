import React from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';

// const StyledModal = styled(Modal)`
//   position: absolute;
//   top: 40px;
//   left: 40px;
//   right: 40px;
//   bottom: 40px;
//   border: 1px solid #ccc;
//   background: #fff;
//   overflow: auto;
//   webkitoverflowscrolling: touch;
//   borderradius: 4px;
//   outline: none;
//   padding: 20px;
// `;

const StyledModal = styled(Modal)`
  border: 1px solid #ccc;
  background: #fff;
  overflow: auto;
  webkitoverflowscrolling: touch;
  borderradius: 4px;
  outline: none;
  padding: 20px;

  width: 50%;
  max-width: 900px;
  margin: auto;
  margin-top: 15vh;
`;

export default function ModalBase({ modalState, children }) {
  return (
    <StyledModal isOpen={modalState.isOpen} onRequestClose={modalState.close}>
      {children}
    </StyledModal>
  );
}
