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
  const childrenArray = _.isArray(children) ? children : [children];
  if (childrenArray.length !== 1 && childrenArray.length != 2) {
    throw new Error('Splitter must have 1 or 2 children');
  }
  return (
    <MainContainer>
      <ChildContainer>{childrenArray[0]}</ChildContainer>
      {childrenArray[1] && <ChildContainer>{childrenArray[1]}</ChildContainer>}
    </MainContainer>
  );
}
