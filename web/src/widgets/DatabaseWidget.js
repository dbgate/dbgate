import React from 'react';
import styled from 'styled-components';

import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import useFetch from '../utility/useFetch';
import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';
import { useSetCurrentDatabase, useCurrentDatabase } from '../utility/globalState';
import tableAppObject from '../appobj/tableAppObject';
import theme from '../theme';

const MainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
`;

const InnerContainer = styled.div`
  flex: 1 0;
  overflow: scroll;
  width: ${theme.leftPanel.width}px;
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

function ConnectionList() {
  const modalState = useModalState();
  const connections = useFetch({
    url: 'connections/list',
    reloadTrigger: 'connection-list-changed',
  });
  return (
    <>
      <ConnectionModal modalState={modalState} />
      <button onClick={modalState.open}>Add connection</button>
      <AppObjectList list={connections} makeAppObj={connectionAppObject} SubItems={SubDatabaseList} />
    </>
  );
}

function SqlObjectList({ id, database }) {
  const objects = useFetch({
    url: `database-connections/list-objects?id=${id}&database=${database}`,
    reloadTrigger: `database-structure-changed-${id}-${database}`,
  });
  const { tables } = objects || {};
  return (
    <>
      <AppObjectList list={(tables || []).map(x => ({ ...x, id, database }))} makeAppObj={tableAppObject} />
    </>
  );
}

function SqlObjectListWrapper() {
  const db = useCurrentDatabase();

  if (!db) return <div>(Choose database)</div>;
  const { name, connection } = db;

  return <SqlObjectList id={connection._id} database={name} />;
  // return <div>tables of {db && db.name}</div>
  // return <div>tables of {JSON.stringify(db)}</div>
}

export default function DatabaseWidget() {
  return (
    <MainContainer>
      <InnerContainer>
        <ConnectionList />
      </InnerContainer>
      <InnerContainer>
        <SqlObjectListWrapper />
      </InnerContainer>
    </MainContainer>
  );
}
