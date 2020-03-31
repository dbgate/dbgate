import React from 'react';
import styled from 'styled-components';

import useFetch from '../utility/useFetch';
import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';
import { useSetCurrentDatabase, useCurrentDatabase } from '../utility/globalState';
import tableAppObject from '../appobj/tableAppObject';
import theme from '../theme';

const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

const MainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
  flex-direction: column;
`;

const OuterContainer = styled.div`
  flex: 1 1 0;
  // min-height: 10px;
  overflow: hidden;
  width: ${theme.leftPanel.width}px;
  position: relative;
  flex-direction: column;
  display: flex;
`;

const InnerContainer = styled.div`
  flex: 1 1;
  overflow: scroll;
  width: ${theme.leftPanel.width}px;
`;

const Button = styled.button`
  // -webkit-appearance: none;
  // -moz-appearance: none;
  // appearance: none;
  // width: 50px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 90px;
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
    url: `server-connections/list-databases?conid=${_id}`,
    reloadTrigger: `database-list-changed-${_id}`,
  });
  return <AppObjectList list={databases} makeAppObj={databaseAppObject} onObjectClick={handleDatabaseClick} />;
}

function ConnectionList() {
  const connections = useFetch({
    url: 'connections/list',
    reloadTrigger: 'connection-list-changed',
  });
  return (
    <>
      <SearchBoxWrapper>
        <Input type="text" placeholder="Search" />
        <Button>Hide</Button>
        <Button>Show</Button>
      </SearchBoxWrapper>

      <InnerContainer>
        <AppObjectList list={connections} makeAppObj={connectionAppObject} SubItems={SubDatabaseList} />
      </InnerContainer>
    </>
  );
}

function SqlObjectList({ conid, database }) {
  const objects = useFetch({
    url: `database-connections/list-objects?conid=${conid}&database=${database}`,
    reloadTrigger: `database-structure-changed-${conid}-${database}`,
  });
  const { tables } = objects || {};
  return (
    <>
      <AppObjectList list={(tables || []).map(x => ({ ...x, conid, database }))} makeAppObj={tableAppObject} />
    </>
  );
}

function SqlObjectListWrapper() {
  const db = useCurrentDatabase();

  if (!db) return <div>(Choose database)</div>;
  const { name, connection } = db;

  return <SqlObjectList conid={connection._id} database={name} />;
  // return <div>tables of {db && db.name}</div>
  // return <div>tables of {JSON.stringify(db)}</div>
}

export default function DatabaseWidget() {
  return (
    <MainContainer>
      <OuterContainer>
        <ConnectionList />
      </OuterContainer>
      <OuterContainer>
        <SqlObjectListWrapper />
      </OuterContainer>
    </MainContainer>
  );
}
