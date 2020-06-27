import React from 'react';

import styled from 'styled-components';
import { FontIcon } from '../icons';

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-right: 10px;
`;

const Icon = styled.div`
  font-size: 20pt;
  margin: 10px;
`;

export default function ErrorInfo({ message, icon = 'fas fa-times-circle red' }) {
  return (
    <Container>
      <Icon>
        <FontIcon icon={icon} />
      </Icon>
      {message}
    </Container>
  );
}
