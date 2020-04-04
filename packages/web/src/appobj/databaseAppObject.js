import React from 'react';
import _ from 'lodash';
import { DatabaseIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';

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

const databaseAppObject = flags => ({ name, connection }) => {
  const { boldCurrentDatabase } = flags || {};
  const title = name;
  const key = name;
  const Icon = DatabaseIcon;
  const isBold = boldCurrentDatabase
    ? ({ currentDatabase }) => {
        return (
          _.get(currentDatabase, 'connection._id') == _.get(connection, '_id') && _.get(currentDatabase, 'name') == name
        );
      }
    : null;

  return { title, key, Icon, Menu, isBold };
};

export default databaseAppObject;
