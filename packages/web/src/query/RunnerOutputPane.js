import React from 'react';
import { HorizontalSplitter } from '../widgets/Splitter';
import SocketMessagesView from './SocketMessagesView';
import { WidgetTitle } from '../widgets/WidgetStyles';
import RunnerOutputFiles from './RunnerOuputFiles';
import styled from 'styled-components';

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export default function RunnerOutputPane({ runnerId, executeNumber }) {
  return (
    <HorizontalSplitter>
      <Container>
        <WidgetTitle>Messages</WidgetTitle>
        <SocketMessagesView eventName={runnerId ? `runner-info-${runnerId}` : null} executeNumber={executeNumber} />
      </Container>
      <Container>
        <WidgetTitle>Output files</WidgetTitle>
        <RunnerOutputFiles runnerId={runnerId} executeNumber={executeNumber} />
      </Container>
    </HorizontalSplitter>
  );
}
