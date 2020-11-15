import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import axios from '../utility/axios';
import { filterName } from '@dbgate/datalib';

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    axios.post('archive/delete-folder', { folder: data.name });
  };
  return <>{data.name != 'default' && <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>}</>;
}

const archiveFolderAppObject = () => ({ name }, { setOpenedTabs, currentArchive }) => {
  const key = name;
  const icon = 'img archive-folder';
  const isBold = name == currentArchive;
  const matcher = (filter) => filterName(filter, name);

  return { title: name, key, icon, isBold, Menu, matcher };
};

export default archiveFolderAppObject;
