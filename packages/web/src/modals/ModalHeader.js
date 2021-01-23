import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const Wrapper = styled.div`
  font-size: 15pt;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  background-color: ${props => props.theme.modalheader_background};
`;

const CloseWrapper = styled.div`
  font-size: 12pt;
  &:hover {
    background-color: ${props => props.theme.modalheader_background2};
  }
  padding: 5px 10px;
  border-radius: 10px;
`;

export default function ModalHeader({ children, modalState }) {
  const theme = useTheme();
  return (
    <Wrapper theme={theme}>
      <div>{children}</div>
      <CloseWrapper onClick={modalState.close} theme={theme}>
        <FontIcon icon="icon close" />
      </CloseWrapper>
    </Wrapper>
  );
}
