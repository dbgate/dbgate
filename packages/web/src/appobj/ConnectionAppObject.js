import _ from 'lodash';
import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { filterName } from 'dbgate-datalib';
import ConfirmModal from '../modals/ConfirmModal';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';
import { useCurrentDatabase, useOpenedConnections, useSetOpenedConnections } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';
import useShowModal from '../modals/showModal';
import { useConfig } from '../utility/metadataLoaders';
import useExtensions from '../utility/useExtensions';

function Menu({ data }) {
  const openedConnections = useOpenedConnections();
  const setOpenedConnections = useSetOpenedConnections();
  const showModal = useShowModal();
  const config = useConfig();

  const handleEdit = () => {
    showModal(modalState => <ConnectionModal modalState={modalState} connection={data} />);
  };
  const handleDelete = () => {
    showModal(modalState => (
      <ConfirmModal
        modalState={modalState}
        message={`Really delete connection ${data.displayName || data.server}?`}
        onConfirm={() => axios.post('connections/delete', data)}
      />
    ));
  };
  const handleCreateDatabase = () => {
    showModal(modalState => <CreateDatabaseModal modalState={modalState} conid={data._id} />);
  };
  const handleRefresh = () => {
    axios.post('server-connections/refresh', { conid: data._id });
  };
  const handleDisconnect = () => {
    setOpenedConnections(list => list.filter(x => x != data._id));
  };
  const handleConnect = () => {
    setOpenedConnections(list => _.uniq([...list, data._id]));
  };
  return (
    <>
      {config.runAsPortal == false && (
        <>
          <DropDownMenuItem onClick={handleEdit}>Edit</DropDownMenuItem>
          <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
        </>
      )}
      {!openedConnections.includes(data._id) && <DropDownMenuItem onClick={handleConnect}>Connect</DropDownMenuItem>}
      {openedConnections.includes(data._id) && data.status && (
        <DropDownMenuItem onClick={handleRefresh}>Refresh</DropDownMenuItem>
      )}
      {openedConnections.includes(data._id) && (
        <DropDownMenuItem onClick={handleDisconnect}>Disconnect</DropDownMenuItem>
      )}
      {openedConnections.includes(data._id) && (
        <DropDownMenuItem onClick={handleCreateDatabase}>Create database</DropDownMenuItem>
      )}
    </>
  );
}

function ConnectionAppObject({ data, commonProps }) {
  const { _id, server, displayName, engine, status } = data;
  const openedConnections = useOpenedConnections();
  const setOpenedConnections = useSetOpenedConnections();
  const currentDatabase = useCurrentDatabase();
  const extensions = useExtensions();

  const isBold = _.get(currentDatabase, 'connection._id') == _id;
  const onClick = () => setOpenedConnections(c => _.uniq([...c, _id]));

  let statusIcon = null;
  let statusTitle = null;

  let extInfo = null;
  if (extensions.drivers.find(x => x.engine == engine)) {
    const match = (engine || '').match(/^([^@]*)@/);
    extInfo = match ? match[1] : engine;
  } else {
    extInfo = engine;
    statusIcon = 'img warn';
    statusTitle = `Engine driver ${engine} not found, review installed plugins and change engine in edit connection dialog`;
  }

  if (openedConnections.includes(_id)) {
    if (!status) statusIcon = 'icon loading';
    else if (status.name == 'pending') statusIcon = 'icon loading';
    else if (status.name == 'ok') statusIcon = 'img ok';
    else statusIcon = 'img error';
    if (status && status.name == 'error') {
      statusTitle = status.message;
    }
  }

  return (
    <AppObjectCore
      {...commonProps}
      title={displayName || server}
      icon="img server"
      data={data}
      statusIcon={statusIcon}
      statusTitle={statusTitle}
      extInfo={extInfo}
      isBold={isBold}
      onClick={onClick}
      Menu={Menu}
    />
  );
}

ConnectionAppObject.extractKey = data => data._id;
ConnectionAppObject.createMatcher = ({ displayName, server }) => filter => filterName(filter, displayName, server);

export default ConnectionAppObject;
