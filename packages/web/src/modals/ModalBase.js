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

  width: 50%;
  max-width: 900px;
  margin: auto;
  margin-top: 15vh;

  // z-index:1200;
`;

const ModalContent = styled.div`
  padding: 20px;
`;

export default function ModalBase({ modalState, children }) {
  return (
    <StyledModal
      isOpen={modalState.isOpen}
      onRequestClose={modalState.close}
      overlayClassName="RactModalOverlay"
      // style={{
      //   overlay: {
      //     backgroundColor: '#000',
      //     opacity: 0.5,
      //     zIndex: 1000,
      //   },
      //   zIndex: 1200,
      // }}
    >
      {children}
    </StyledModal>
  );
}
