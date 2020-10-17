import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { LocalDbIcon, getIconImage } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    // setOpenedTabs((tabs) => tabs.filter((x) => x.tabid != data.tabid));
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

  return { title: name, key, Icon, isBold, Menu };
};

export default archiveFolderAppObject;
