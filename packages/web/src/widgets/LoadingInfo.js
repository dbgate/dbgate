import React from 'react';

import styled from 'styled-components';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

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
  background-color: ${props => props.theme.main_background2};
  padding: 10px;
  border: 1px solid gray;
`;

export default function LoadingInfo({ message, wrapper = false }) {
  const theme = useTheme();
  const core = (
    <Container>
      <Spinner>
        <FontIcon icon="icon loading" />
      </Spinner>
      {message}
    </Container>
  );
  if (wrapper) {
    return (
      <LoadingInfoWrapper>
        <LoadingInfoBox theme={theme}>{core}</LoadingInfoBox>
      </LoadingInfoWrapper>
    );
  } else {
    return core;
  }
}
