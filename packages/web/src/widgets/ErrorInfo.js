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
  color: red;
`;

export default function ErrorInfo({ message }) {
  return (
    <Container>
      <Icon>
        <i className="fas fa-times-circle" />
      </Icon>
      {message}
    </Container>
  );
}
