import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ChildContainer = styled.div`
  flex: 1;
  // flex: 0 0 50%;
//   flex-basis: 100px;
//   flex-grow: 1;
  display: flex;
  position: relative;
`;

export function VerticalSplitter({ children }) {
  if (!_.isArray(children) || children.length !== 2) {
    throw new Error('Splitter must have exactly 2 children');
  }
  return (
    <MainContainer>
      <ChildContainer>{children[0]}</ChildContainer>
      <ChildContainer>{children[1]}</ChildContainer>
    </MainContainer>
  );
}
