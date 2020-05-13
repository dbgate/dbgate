import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  border-bottom: 1px solid #ccc;
  border-top: 1px solid #ccc;
  padding: 15px;
`;

export default function ModalContent({ children }) {
  return <Wrapper>{children}</Wrapper>;
}
