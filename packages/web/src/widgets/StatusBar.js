import React from 'react';
import styled from 'styled-components';

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
          <span className="mdi mdi-database" /> {name}
        </Item>
      )}
      {(displayName || server) && (
        <Item>
          <span className='mdi mdi-server'/> {displayName || server}
        </Item>
      )}

      {user && (
        <Item>
          <span className="mdi mdi-account" /> {user}
        </Item>
      )}

      {connection && status && (
        <Item>
          {status.name == 'pending' && (
            <>
              <span className="mdi mdi-loading mdi-spin" /> Loading
            </>
          )}
          {status.name == 'ok' && (
            <>
              <span className="mdi mdi-check-circle color-on-statusbar-green" /> Connected
            </>
          )}
          {status.name == 'error' && (
            <>
              <span className="mdi mdi-close-circle color-red" /> Error
            </>
          )}
        </Item>
      )}
      {!connection && (
        <Item>
          <>
            <span className="mdi mdi-lan-disconnect" /> Not connected
          </>
        </Item>
      )}
    </Container>
  );
}
