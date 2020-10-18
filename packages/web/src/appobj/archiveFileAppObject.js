import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DatabaseIcon, getIconImage, ArchiveTableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { filterName } from '@dbgate/datalib';
import axios from '../utility/axios';

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    axios.post('archive/delete-file', { file: data.fileName, folder: data.folderName });
    // setOpenedTabs((tabs) => tabs.filter((x) => x.tabid != data.tabid));
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const archiveFileAppObject = () => ({ fileName, folderName }, { setOpenedTabs }) => {
  const key = fileName;
  // const Icon = (props) => <i className="fas fa-archive" />;
  const Icon = ArchiveTableIcon;
  const onClick = () => {
    openNewTab(setOpenedTabs, {
      title: fileName,
      icon: 'archtable.svg',
      tooltip: `${folderName}\n${fileName}`,
      tabComponent: 'ArchiveFileTab',
      props: {
        archiveFile: fileName,
        archiveFolder: folderName,
      },
    });
  };
  const matcher = (filter) => filterName(filter, fileName);

  return { title: fileName, key, Icon, Menu, onClick, matcher };
};

export default archiveFileAppObject;
