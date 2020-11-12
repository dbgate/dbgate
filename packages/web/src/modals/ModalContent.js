import React from 'react';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';

const Wrapper = styled.div`
  border-bottom: 1px solid ${(props) => props.theme.border};
  border-top: 1px solid ${(props) => props.theme.border};
  padding: 15px;
`;

export default function ModalContent({ children }) {
  const theme = useTheme();
  return <Wrapper theme={theme}>{children}</Wrapper>;
}
