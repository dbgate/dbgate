import _ from 'lodash';
import React from 'react';
import { getEngineIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { filterName } from '@dbgate/datalib';

function Menu({ data, setOpenedConnections }) {
  const handleEdit = () => {
    showModal((modalState) => <ConnectionModal modalState={modalState} connection={data} />);
  };
  const handleDelete = () => {
    axios.post('connections/delete', data);
  };
  const handleRefresh = () => {
    axios.post('server-connections/refresh', { conid: data._id });
  };
  const handleDisconnect = () => {
    setOpenedConnections((list) => list.filter((x) => x != data._id));
  };
  return (
    <>
      <DropDownMenuItem onClick={handleEdit}>Edit</DropDownMenuItem>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
      <DropDownMenuItem onClick={handleRefresh}>Refresh</DropDownMenuItem>
      <DropDownMenuItem onClick={handleDisconnect}>Disconnect</DropDownMenuItem>
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

  // let isBusy = false;
  let statusIcon = null;
  if (openedConnections.includes(_id)) {
    if (!status) statusIcon = 'fas fa-spinner fa-spin';
    else if (status.name == 'pending') statusIcon = 'fas fa-spinner fa-spin';
    else if (status.name == 'ok') statusIcon = 'fas fa-check-circle green';
    else statusIcon = 'fas fa-times-circle red';
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
    // isBusy,
    statusIcon,
  };
};

export default connectionAppObject;
