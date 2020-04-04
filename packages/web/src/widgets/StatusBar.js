import React from 'react';
import styled from 'styled-components';

import { getEngineIcon } from '../icons';
import { useCurrentDatabase } from '../utility/globalState';

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
    </Container>
  );
}
