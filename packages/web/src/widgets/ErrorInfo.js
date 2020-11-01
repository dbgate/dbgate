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

const ContainerSmall = styled.div`
  display: flex;
  margin-right: 10px;
`;

export default function ErrorInfo({ message, icon = 'fas fa-times-circle red', isSmall = false }) {
  if (isSmall) {
    return (
      <ContainerSmall>
        <FontIcon icon={icon} />
        {message}
      </ContainerSmall>
    );
  }
  return (
    <Container>
      <Icon>
        <FontIcon icon={icon} />
      </Icon>
      {message}
    </Container>
  );
}
