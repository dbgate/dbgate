import React from 'react';
import styled from 'styled-components';
import resolveApi from '../utility/resolveApi';

const Frame = styled.iframe`
  flex: 1;
  border: 0px solid gray;
`;

export default function InfoPageTab({ page }) {
  return <Frame src={`${resolveApi()}/pages/${page}`} />;
}
