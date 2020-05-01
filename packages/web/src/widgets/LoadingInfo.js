import React from 'react';

import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-right: 10px;
`;

const Spinner = styled.div`
  font-size: 20pt;
  margin: 10px;
`;

export default function LoadingInfo({ message }) {
  return (
    <Container>
      <Spinner>
        <i className="fas fa-spinner fa-spin" />
      </Spinner>
      {message}
    </Container>
  );
}
