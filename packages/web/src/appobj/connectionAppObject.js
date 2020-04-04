import _ from 'lodash';
import React from 'react';
import { getEngineIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { filterName } from '@dbgate/datalib';

function Menu({ data, makeAppObj }) {
  const handleEdit = () => {
    showModal(modalState => <ConnectionModal modalState={modalState} connection={data} />);
  };
  const handleDelete = () => {
    axios.post('connections/delete', data);
  };
  return (
    <>
      <DropDownMenuItem onClick={handleEdit}>Edit</DropDownMenuItem>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const connectionAppObject = flags => ({ _id, server, displayName, engine }) => {
  const title = displayName || server;
  const key = _id;
  const Icon = getEngineIcon(engine);
  const matcher = filter => filterName(filter, displayName, server);
  const { boldCurrentDatabase } = flags || {};
  const isBold = boldCurrentDatabase
    ? ({ currentDatabase }) => {
        return _.get(currentDatabase, 'connection._id') == _id;
      }
    : null;

  return { title, key, Icon, Menu, matcher, isBold };
};

export default connectionAppObject;
