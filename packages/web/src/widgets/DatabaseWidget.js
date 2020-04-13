import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';
import { useSetCurrentDatabase, useCurrentDatabase } from '../utility/globalState';
import InlineButton from './InlineButton';
import databaseObjectAppObject from '../appobj/databaseObjectAppObject';
import { useSqlObjectList, useDatabaseList, useConnectionList } from '../utility/metadataLoaders';
import { SearchBoxWrapper, InnerContainer, Input, MainContainer, OuterContainer, WidgetTitle } from './WidgetStyles';

function SubDatabaseList({ data }) {
  const setDb = useSetCurrentDatabase();
  const handleDatabaseClick = (database) => {
    setDb({
      ...database,
      connection: data,
    });
  };
  const { _id } = data;
  const databases = useDatabaseList({ conid: _id });
  return (
    <AppObjectList
      list={(databases || []).map((db) => ({ ...db, connection: data }))}
      makeAppObj={databaseAppObject({ boldCurrentDatabase: true })}
      onObjectClick={handleDatabaseClick}
    />
  );
}

function ConnectionList() {
  const connections = useConnectionList();

  const [filter, setFilter] = React.useState('');
  return (
    <>
      <WidgetTitle>Connections</WidgetTitle>
      <SearchBoxWrapper>
        <Input type="text" placeholder="Search connection" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <InlineButton>Refresh</InlineButton>
      </SearchBoxWrapper>

      <InnerContainer>
        <AppObjectList
          list={connections}
          makeAppObj={connectionAppObject({ boldCurrentDatabase: true })}
          SubItems={SubDatabaseList}
          filter={filter}
        />
      </InnerContainer>
    </>
  );
}

function SqlObjectList({ conid, database }) {
  const objects = useSqlObjectList({ conid, database });

  const [filter, setFilter] = React.useState('');
  const objectList = _.flatten(
    ['tables', 'views', 'procedures', 'functions'].map((objectTypeField) =>
      ((objects || {})[objectTypeField] || []).map((obj) => ({ ...obj, objectTypeField }))
    )
  );
  return (
    <>
      <WidgetTitle>Tables, views, functions</WidgetTitle>
      <SearchBoxWrapper>
        <Input
          type="text"
          placeholder="Search tables or objects"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <InlineButton>Refresh</InlineButton>
      </SearchBoxWrapper>
      <InnerContainer>
        <AppObjectList
          list={objectList.map((x) => ({ ...x, conid, database }))}
          makeAppObj={databaseObjectAppObject()}
          groupFunc={(appobj) => appobj.groupTitle}
          filter={filter}
        />
      </InnerContainer>
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
