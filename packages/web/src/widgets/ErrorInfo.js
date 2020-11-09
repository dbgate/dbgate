import React from 'react';

import styled from 'styled-components';

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

export default function ErrorInfo({ message, icon = 'mdi mdi-close-circle color-red', isSmall = false }) {
  if (isSmall) {
    return (
      <ContainerSmall>
        <span className={icon} />
        {message}
      </ContainerSmall>
    );
  }
  return (
    <Container>
      <Icon>
        <span className={icon} />
      </Icon>
      {message}
    </Container>
  );
}
