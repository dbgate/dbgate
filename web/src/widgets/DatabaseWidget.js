import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import useFetch from '../utility/useFetch';
import { AppObjectList } from '../appobj/AppObjects';
import connectionAppObject from '../appobj/connectionAppObject';

export default function DatabaseWidget() {
  const modalState = useModalState();
  const connections = useFetch('connections/list', []);
  console.log(connections);
  return (
    <>
      <ConnectionModal modalState={modalState} />
      <button onClick={modalState.open}>Add connection</button>
      <AppObjectList list={connections} makeAppObj={connectionAppObject} />
    </>
  );
}
