import React from 'react';
import styled from 'styled-components';

import { getEngineIcon } from '../icons';
import { useCurrentDatabase } from '../utility/globalState';
import { useDatabaseStatus } from '../utility/metadataLoaders';
import { FontIcon } from '../icons';

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
  const EngineIcon = getEngineIcon(engine);
  return (
    <Container>
      {name && (
        <Item>
          <i className="fas fa-database" /> {name}
        </Item>
      )}
      {(displayName || server) && (
        <Item>
          <EngineIcon size={12} /> {displayName || server}
        </Item>
      )}

      {user && (
        <Item>
          <i className="fas fa-user" /> {user}
        </Item>
      )}

      {connection && status && (
        <Item>
          {status.name == 'pending' && (
            <>
              <FontIcon icon="fas fa-spinner fa-spin" /> Loading
            </>
          )}
          {status.name == 'ok' && (
            <>
              <FontIcon icon="fas fa-check-circle lime" /> Connected
            </>
          )}
          {status.name == 'error' && (
            <>
              <FontIcon icon="fas fa-times-circle red" /> Error
            </>
          )}
        </Item>
      )}
      {!connection && (
        <Item>
          <>
            <FontIcon icon="fas fa-plug gray" /> Not connected
          </>
        </Item>
      )}
    </Container>
  );
}
