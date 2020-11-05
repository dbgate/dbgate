import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';
import { useSetCurrentDatabase, useCurrentDatabase, useOpenedConnections } from '../utility/globalState';
import InlineButton from './InlineButton';
import databaseObjectAppObject from '../appobj/databaseObjectAppObject';
import {
  // useSqlObjectList,
  useDatabaseList,
  useConnectionList,
  useServerStatus,
  useDatabaseStatus,
  useDatabaseInfo,
} from '../utility/metadataLoaders';
import {
  SearchBoxWrapper,
  WidgetsInnerContainer,
  WidgetsMainContainer,
  WidgetsOuterContainer,
  WidgetTitle,
} from './WidgetStyles';
import axios from '../utility/axios';
import LoadingInfo from './LoadingInfo';
import SearchInput from './SearchInput';
import ErrorInfo from './ErrorInfo';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';

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
  const serverStatus = useServerStatus();
  const openedConnections = useOpenedConnections();
  const connectionsWithStatus =
    connections && serverStatus
      ? connections.map((conn) => ({ ...conn, status: serverStatus[conn._id] }))
      : connections;

  const handleRefreshConnections = () => {
    for (const conid of openedConnections) {
      axios.post('server-connections/refresh', { conid });
    }
  };

  const [filter, setFilter] = React.useState('');
  return (
    <>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search connection" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshConnections}>Refresh</InlineButton>
      </SearchBoxWrapper>

      <WidgetsInnerContainer>
        <AppObjectList
          list={connectionsWithStatus}
          makeAppObj={connectionAppObject({ boldCurrentDatabase: true })}
          SubItems={SubDatabaseList}
          filter={filter}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function SqlObjectList({ conid, database }) {
  const objects = useDatabaseInfo({ conid, database });
  const status = useDatabaseStatus({ conid, database });

  const handleRefreshDatabase = () => {
    axios.post('database-connections/refresh', { conid, database });
  };

  const [filter, setFilter] = React.useState('');
  const objectList = _.flatten(
    ['tables', 'views', 'procedures', 'functions'].map((objectTypeField) =>
      _.sortBy(
        ((objects || {})[objectTypeField] || []).map((obj) => ({ ...obj, objectTypeField })),
        ['schemaName', 'pureName']
      )
    )
  );
  const inputRef = React.useRef(null);
  return (
    <>
      <SearchBoxWrapper>
        <SearchInput inputRef={inputRef} placeholder="Search tables or objects" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshDatabase}>Refresh</InlineButton>
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        {status && status.name == 'pending' ? (
          <LoadingInfo message="Loading database structure" />
        ) : (
          <AppObjectList
            list={objectList.map((x) => ({ ...x, conid, database }))}
            makeAppObj={databaseObjectAppObject()}
            groupFunc={(appobj) => appobj.groupTitle}
            filter={filter}
          />
        )}
      </WidgetsInnerContainer>
    </>
  );
}

function SqlObjectListWrapper() {
  const db = useCurrentDatabase();

  if (!db) {
    return <ErrorInfo message="Database not selected" icon="fas fa-exclamation-circle blue" />;
  }
  const { name, connection } = db;

  return <SqlObjectList conid={connection._id} database={name} />;
  // return <div>tables of {db && db.name}</div>
  // return <div>tables of {JSON.stringify(db)}</div>
}

export default function DatabaseWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Connections" name="connections" height="50%">
        <ConnectionList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Tables, views, functions" name="dbObjects">
        <SqlObjectListWrapper />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
