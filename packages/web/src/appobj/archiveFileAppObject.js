import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DatabaseIcon, getIconImage, ArchiveTableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { filterName } from '@dbgate/datalib';
import axios from '../utility/axios';

function openArchive(setOpenedTabs, fileName, folderName) {
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
}

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    axios.post('archive/delete-file', { file: data.fileName, folder: data.folderName });
    // setOpenedTabs((tabs) => tabs.filter((x) => x.tabid != data.tabid));
  };
  const handleOpenRead = () => {
    openArchive(setOpenedTabs, data.fileName, data.folderName);
  };
  const handleOpenWrite = async () => {
    const resp = await axios.post('archive/load-free-table', { file: data.fileName, folder: data.folderName });

    openNewTab(setOpenedTabs, {
      title: data.fileName,
      icon: 'freetable.svg',
      tabComponent: 'FreeTableTab',
      props: {
        initialData: resp.data,
        archiveFile: data.fileName,
        archiveFolder: data.folderName,
      },
    });
  };

  return (
    <>
      <DropDownMenuItem onClick={handleOpenRead}>Open (readonly)</DropDownMenuItem>
      <DropDownMenuItem onClick={handleOpenWrite}>Open in free table editor</DropDownMenuItem>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const archiveFileAppObject = () => ({ fileName, folderName }, { setOpenedTabs }) => {
  const key = fileName;
  // const Icon = (props) => <i className="fas fa-archive" />;
  const Icon = ArchiveTableIcon;
  const onClick = () => {
    openArchive(setOpenedTabs, fileName, folderName);
  };
  const matcher = (filter) => filterName(filter, fileName);

  return { title: fileName, key, Icon, Menu, onClick, matcher };
};

export default archiveFileAppObject;
