import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

import { useCurrentDatabase } from '../utility/globalState';
import { useDatabaseStatus } from '../utility/metadataLoaders';

const Container = styled.div`
  display: flex;
  color: ${props => props.theme.statusbar_font1};
  align-items: stretch;
  justify-content: space-between;
`;

export const StatusBarItem = styled.div`
  padding: 2px 10px;
  //   margin: auto;
  //   flex-grow: 0;
`;

const ErrorWrapper = styled.span`
  color: ${props =>
    // @ts-ignore
    props.theme.statusbar_font_red[5]};
`;

const InfoWrapper = styled.span`
  color: ${props =>
    // @ts-ignore
    props.theme.statusbar_font_green[5]};
`;

const StatusbarContainer = styled.div`
  display: flex;
  // align-items: flex-end;
  // display: flex;
  // user-select: none;
`;

export default function StatusBar({ statusbarPortalRef }) {
  const { name, connection } = useCurrentDatabase() || {};
  const status = useDatabaseStatus(connection ? { conid: connection._id, database: name } : {});
  const { displayName, server, user, engine } = connection || {};
  const theme = useTheme();
  return (
    <Container theme={theme}>
      <StatusbarContainer>
        {name && (
          <StatusBarItem>
            <FontIcon icon="icon database" /> {name}
          </StatusBarItem>
        )}
        {(displayName || server) && (
          <StatusBarItem>
            <FontIcon icon="icon server" /> {displayName || server}
          </StatusBarItem>
        )}

        {user && (
          <StatusBarItem>
            <FontIcon icon="icon account" /> {user}
          </StatusBarItem>
        )}

        {connection && status && (
          <StatusBarItem>
            {status.name == 'pending' && (
              <>
                <FontIcon icon="icon loading" /> Loading
              </>
            )}
            {status.name == 'ok' && (
              <>
                <InfoWrapper theme={theme}>
                  <FontIcon icon="icon ok" />
                </InfoWrapper>{' '}
                Connected
              </>
            )}
            {status.name == 'error' && (
              <>
                <ErrorWrapper theme={theme}>
                  <FontIcon icon="icon error" />
                </ErrorWrapper>{' '}
                Error
              </>
            )}
          </StatusBarItem>
        )}
        {!connection && (
          <StatusBarItem>
            <>
              <FontIcon icon="icon disconnected" /> Not connected
            </>
          </StatusBarItem>
        )}
      </StatusbarContainer>
      <StatusbarContainer ref={statusbarPortalRef}></StatusbarContainer>
    </Container>
  );
}
