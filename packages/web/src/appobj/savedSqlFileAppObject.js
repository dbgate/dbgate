import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';

function Menu({ data }) {
  const handleDelete = () => {
    axios.post('files/delete', { folder: 'sql', file: data.name });
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const savedSqlFileAppObject = () => ({ name }, { setOpenedTabs, newQuery, openedTabs }) => {
  const key = name;
  const title = name;
  const icon = 'img sql-file';

  const onClick = async () => {
    const resp = await axios.post('files/load', { folder: 'sql', file: name });
    newQuery({
      title: name,
      initialScript: resp.data,
    });
  };

  return { title, key, icon, onClick, Menu };
};

export default savedSqlFileAppObject;
