import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { filterName } from 'dbgate-datalib';
import axios from '../utility/axios';
import { useSetOpenedTabs } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';

function openArchive(setOpenedTabs, fileName, folderName) {
  openNewTab(setOpenedTabs, {
    title: fileName,
    icon: 'img archive',
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
      icon: 'img archive',
      tabComponent: 'FreeTableTab',
      props: {
        initialArgs: {
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

function ArchiveFileAppObject({ data, commonProps }) {
  const { fileName, folderName } = data;
  const setOpenedTabs = useSetOpenedTabs();
  const onClick = () => {
    openArchive(setOpenedTabs, fileName, folderName);
  };

  return (
    <AppObjectCore {...commonProps} data={data} title={fileName} icon="img archive" onClick={onClick} Menu={Menu} />
  );
}

ArchiveFileAppObject.extractKey = (data) => data.fileName;
ArchiveFileAppObject.createMatcher = ({ fileName }) => (filter) => filterName(filter, fileName);

export default ArchiveFileAppObject;
