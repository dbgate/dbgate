import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import useFetch from '../utility/useFetch';
import { AppObjectList } from '../appobj/AppObjectList';
import connectionAppObject from '../appobj/connectionAppObject';
import databaseAppObject from '../appobj/databaseAppObject';

function SubDatabaseList({ data }) {
  const { _id } = data;
  const databases = useFetch({
    url: `server-connections/list-databases?id=${_id}`,
    reloadTrigger: `database-list-changed-${_id}`,
  });
  return <AppObjectList list={databases} makeAppObj={databaseAppObject} />
}

export default function DatabaseWidget() {
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
