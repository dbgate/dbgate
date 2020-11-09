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

const LoadingInfoWrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
`;
const LoadingInfoBox = styled.div`
  background-color: #ccc;
  padding: 10px;
  border: 1px solid gray;
`;

export default function LoadingInfo({ message, wrapper = false }) {
  const core = (
    <Container>
      <Spinner>
        <span className="mdi mdi-loading mdi-spin" />
      </Spinner>
      {message}
    </Container>
  );
  if (wrapper) {
    return (
      <LoadingInfoWrapper>
        <LoadingInfoBox>{core}</LoadingInfoBox>
      </LoadingInfoWrapper>
    );
  } else {
    return core;
  }
}
