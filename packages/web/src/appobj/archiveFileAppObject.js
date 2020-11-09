import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { filterName } from '@dbgate/datalib';
import axios from '../utility/axios';

const archiveTableIcon = 'mdi mdi-table color-yellow-icon';

function openArchive(setOpenedTabs, fileName, folderName) {
  openNewTab(setOpenedTabs, {
    title: fileName,
    icon: archiveTableIcon,
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
    // const resp = await axios.post('archive/load-free-table', { file: data.fileName, folder: data.folderName });

    openNewTab(setOpenedTabs, {
      title: data.fileName,
      icon: archiveTableIcon,
      tabComponent: 'FreeTableTab',
      props: {
        initialData: {
          functionName: 'archiveReader',
          props: {
            fileName: data.fileName,
            folderName: data.folderName,
          },
        },
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
  const icon = archiveTableIcon;
  const onClick = () => {
    openArchive(setOpenedTabs, fileName, folderName);
  };
  const matcher = (filter) => filterName(filter, fileName);

  return { title: fileName, key, icon, Menu, onClick, matcher };
};

export default archiveFileAppObject;
