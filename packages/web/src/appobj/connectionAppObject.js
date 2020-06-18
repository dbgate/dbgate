import _ from 'lodash';
import React from 'react';
import { getEngineIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import useShowModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { filterName } from '@dbgate/datalib';
import ConfirmModal from '../modals/ConfirmModal';
import { useConfig } from '../utility/metadataLoaders';
import CreateDatabaseModal from '../modals/CreateDatabaseModal';

function Menu({ data, setOpenedConnections, openedConnections, config, showModal }) {
  const handleEdit = () => {
    showModal((modalState) => <ConnectionModal modalState={modalState} connection={data} />);
  };
  const handleDelete = () => {
    showModal((modalState) => (
      <ConfirmModal
        modalState={modalState}
        message={`Really delete connection ${data.displayName || data.server}?`}
        onConfirm={() => axios.post('connections/delete', data)}
      />
    ));
  };
  const handleCreateDatabase = () => {
    showModal((modalState) => <CreateDatabaseModal modalState={modalState} conid={data._id} />);
  };
  const handleRefresh = () => {
    axios.post('server-connections/refresh', { conid: data._id });
  };
  const handleDisconnect = () => {
    setOpenedConnections((list) => list.filter((x) => x != data._id));
  };
  const handleConnect = () => {
    setOpenedConnections((list) => [...list, data._id]);
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

const connectionAppObject = (flags) => (
  { _id, server, displayName, engine, status },
  { openedConnections, setOpenedConnections }
) => {
  const title = displayName || server;
  const key = _id;
  const isExpandable = openedConnections.includes(_id);
  const Icon = getEngineIcon(engine);
  const matcher = (filter) => filterName(filter, displayName, server);
  const { boldCurrentDatabase } = flags || {};
  const isBold = boldCurrentDatabase
    ? ({ currentDatabase }) => {
        return _.get(currentDatabase, 'connection._id') == _id;
      }
    : null;
  const onClick = () => setOpenedConnections((c) => [...c, _id]);

  let statusIcon = null;
  let statusTitle = null;
  if (openedConnections.includes(_id)) {
    if (!status) statusIcon = 'fas fa-spinner fa-spin';
    else if (status.name == 'pending') statusIcon = 'fas fa-spinner fa-spin';
    else if (status.name == 'ok') statusIcon = 'fas fa-check-circle green';
    else statusIcon = 'fas fa-times-circle red';
    if (status && status.name == 'error') {
      statusTitle = status.message;
    }
  }

  return {
    title,
    key,
    Icon,
    Menu,
    matcher,
    isBold,
    isExpandable,
    onClick,
    statusIcon,
    statusTitle,
  };
};

export default connectionAppObject;
