import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { filterName } from 'dbgate-datalib';
import axios from '../utility/axios';
import { AppObjectCore } from './AppObjectCore';
import useOpenNewTab from '../utility/useOpenNewTab';

function openArchive(openNewTab, fileName, folderName) {
  openNewTab({
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

function Menu({ data }) {
  const openNewTab = useOpenNewTab();
  const handleDelete = () => {
    axios.post('archive/delete-file', { file: data.fileName, folder: data.folderName });
    // setOpenedTabs((tabs) => tabs.filter((x) => x.tabid != data.tabid));
  };
  const handleOpenRead = () => {
    openArchive(openNewTab, data.fileName, data.folderName);
  };
  const handleOpenWrite = async () => {
    // const resp = await axios.post('archive/load-free-table', { file: data.fileName, folder: data.folderName });

    openNewTab({
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
  const openNewTab = useOpenNewTab();
  const onClick = () => {
    openArchive(openNewTab, fileName, folderName);
  };

  return (
    <AppObjectCore {...commonProps} data={data} title={fileName} icon="img archive" onClick={onClick} Menu={Menu} />
  );
}

ArchiveFileAppObject.extractKey = (data) => data.fileName;
ArchiveFileAppObject.createMatcher = ({ fileName }) => (filter) => filterName(filter, fileName);

export default ArchiveFileAppObject;
