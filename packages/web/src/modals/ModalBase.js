import React from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import ErrorBoundary from '../utility/ErrorBoundary';

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
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.modal_background};
  overflow: auto;
  webkitoverflowscrolling: touch;
  outline: none;

  ${props =>
    props.fullScreen &&
    `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
      // width: 100%;
      // height: 100%;
    `}

  ${props =>
    !props.fullScreen &&
    `
    border-radius: 10px;
    width: 50%;
    max-width: 900px;
    margin: auto;
    margin-top: 15vh;
        `} 
        
        // z-index:1200;

  ${props =>
    props.isFlex &&
    `
          display: flex;
              `}
`;

const ModalContent = styled.div`
  padding: 20px;
`;

export default function ModalBase({ modalState, children, isFlex = false, fullScreen = false }) {
  const theme = useTheme();
  return (
    <StyledModal
      theme={theme}
      isOpen={modalState.isOpen}
      onRequestClose={modalState.close}
      overlayClassName="RactModalOverlay"
      fullScreen={fullScreen}
      isFlex={isFlex}
      ariaHideApp={false}
      // style={{
      //   overlay: {
      //     backgroundColor: '#000',
      //     opacity: 0.5,
      //     zIndex: 1000,
      //   },
      //   zIndex: 1200,
      // }}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </StyledModal>
  );
}
