import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { LocalDbIcon, getIconImage } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import axios from '../utility/axios';
import { filterName } from '@dbgate/datalib';

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    axios.post('archive/delete-folder', { folder: data.name });
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const archiveFolderAppObject = () => ({ name }, { setOpenedTabs, currentArchive }) => {
  const key = name;
  // const Icon = (props) => <i className="fas fa-archive" />;
  const Icon = LocalDbIcon;
  const isBold = name == currentArchive;
  const matcher = (filter) => filterName(filter, name);

  return { title: name, key, Icon, isBold, Menu, matcher };
};

export default archiveFolderAppObject;
