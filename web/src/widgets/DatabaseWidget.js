import React from 'react';
import styled from 'styled-components';

import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import useFetch from '../utility/useFetch';
import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';
import { useSetCurrentDatabase, useCurrentDatabase } from '../utility/globalState';

const MainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
`;

const InnerContainer = styled.div`
  flex: 1 0;
  overflow: scroll;
`;

function SubDatabaseList({ data }) {
  const setDb = useSetCurrentDatabase();
  const handleDatabaseClick = database => {
    setDb({
      ...database,
      connection: data,
    });
  };
  const { _id } = data;
  const databases = useFetch({
    url: `server-connections/list-databases?id=${_id}`,
    reloadTrigger: `database-list-changed-${_id}`,
  });
  return <AppObjectList list={databases} makeAppObj={databaseAppObject} onObjectClick={handleDatabaseClick} />;
}

export default function DatabaseWidget() {
  const db = useCurrentDatabase();
  const modalState = useModalState();
  const connections = useFetch({
    url: 'connections/list',
    reloadTrigger: 'connection-list-changed',
  });
  return (
    <MainContainer>
      <InnerContainer>
        <ConnectionModal modalState={modalState} />
        <button onClick={modalState.open}>Add connection</button>
        <AppObjectList list={connections} makeAppObj={connectionAppObject} SubItems={SubDatabaseList} />
      </InnerContainer>
      <InnerContainer>tables of {db && db.name}</InnerContainer>
    </MainContainer>
  );
}
