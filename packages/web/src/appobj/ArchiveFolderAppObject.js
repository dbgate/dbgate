import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import axios from '../utility/axios';
import { filterName } from 'dbgate-datalib';
import { AppObjectCore } from './AppObjectCore';
import { useCurrentArchive } from '../utility/globalState';

function Menu({ data }) {
  const handleDelete = () => {
    axios.post('archive/delete-folder', { folder: data.name });
  };
  return <>{data.name != 'default' && <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>}</>;
}

function ArchiveFolderAppObject({ data, commonProps }) {
  const { name } = data;
  const currentArchive = useCurrentArchive();

  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={name}
      icon="img archive-folder"
      isBold={name == currentArchive}
      Menu={Menu}
    />
  );
}

ArchiveFolderAppObject.extractKey = (data) => data.name;
ArchiveFolderAppObject.createMatcher = (data) => (filter) => filterName(filter, data.name);

export default ArchiveFolderAppObject;
