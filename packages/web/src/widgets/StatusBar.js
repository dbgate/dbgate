import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';

import { useCurrentDatabase } from '../utility/globalState';
import { useDatabaseStatus } from '../utility/metadataLoaders';

const Container = styled.div`
  display: flex;
  color: white;
  align-items: stretch;
`;

const Item = styled.div`
  padding: 2px 10px;
  //   margin: auto;
  //   flex-grow: 0;
`;

export default function StatusBar() {
  const { name, connection } = useCurrentDatabase() || {};
  const status = useDatabaseStatus(connection ? { conid: connection._id, database: name } : {});
  const { displayName, server, user, engine } = connection || {};
  return (
    <Container>
      {name && (
        <Item>
          <FontIcon icon="icon database" /> {name}
        </Item>
      )}
      {(displayName || server) && (
        <Item>
          <FontIcon icon="icon server" /> {displayName || server}
        </Item>
      )}

      {user && (
        <Item>
          <FontIcon icon="icon account" /> {user}
        </Item>
      )}

      {connection && status && (
        <Item>
          {status.name == 'pending' && (
            <>
              <FontIcon icon="icon loading" /> Loading
            </>
          )}
          {status.name == 'ok' && (
            <>
              <FontIcon icon="img statusbar-ok" /> Connected
            </>
          )}
          {status.name == 'error' && (
            <>
              <FontIcon icon="img red-error" /> Error
            </>
          )}
        </Item>
      )}
      {!connection && (
        <Item>
          <>
            <FontIcon icon="icon disconnected" /> Not connected
          </>
        </Item>
      )}
    </Container>
  );
}
