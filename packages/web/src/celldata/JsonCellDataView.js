import React from 'react';
import styled from 'styled-components';
import ReactJson from 'react-json-view';
import ErrorInfo from '../widgets/ErrorInfo';

const OuterWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const InnerWrapper = styled.div`
  overflow: scroll;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

export default function JsonCellView({ value }) {
  try {
    const json = JSON.parse(value);
    return (
      <OuterWrapper>
        <InnerWrapper>
          <ReactJson src={json} />
        </InnerWrapper>
      </OuterWrapper>
    );
  } catch (err) {
    return <ErrorInfo message="Error parsing JSON" />;
  }
}
