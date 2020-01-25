import React from 'react';
import uuidv1 from 'uuid/v1';
import { TableIcon } from '../icons';
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

export default function tableAppObject({ pureName, schemaName }, { setOpenedTabs }) {
  const title = schemaName ? `${schemaName}.${pureName}` : pureName;
  const key = title;
  const Icon = TableIcon;
  const onClick = ({ schemaName, pureName }) => {
    const id = uuidv1();
    setOpenedTabs(files => [
      ...files,
      {
        id,
        title: pureName,
        icon: 'table2.svg',
        tabComponent: 'TableDataTab',
        props: {
          schemaName,
          pureName,
        },
      },
    ]);
  };

  return { title, key, Icon, Menu, onClick };
}
