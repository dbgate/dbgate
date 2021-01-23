import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useCurrentArchive, useSetCurrentArchive } from '../utility/globalState';
import { SearchBoxWrapper, WidgetsInnerContainer } from './WidgetStyles';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
import ArchiveFolderAppObject from '../appobj/ArchiveFolderAppObject';
import ArchiveFileAppObject from '../appobj/ArchiveFileAppObject';
import SearchInput from './SearchInput';
import InlineButton from './InlineButton';
import axios from '../utility/axios';

function ArchiveFolderList() {
  const folders = useArchiveFolders();
  const [filter, setFilter] = React.useState('');

  const setArchive = useSetCurrentArchive();

  const handleRefreshFolders = () => {
    axios.post('archive/refresh-folders', {});
  };

  return (
    <>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search archive folders" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshFolders}>Refresh</InlineButton>
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        <AppObjectList
          list={_.sortBy(folders, 'name')}
          AppObjectComponent={ArchiveFolderAppObject}
          onObjectClick={archive => setArchive(archive.name)}
          filter={filter}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function ArchiveFilesList() {
  const folder = useCurrentArchive();
  const files = useArchiveFiles({ folder });
  const [filter, setFilter] = React.useState('');
  const handleRefreshFiles = () => {
    axios.post('archive/refresh-files', { folder });
  };

  return (
    <>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search archive files" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshFiles}>Refresh</InlineButton>
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        <AppObjectList
          list={(files || []).map(file => ({
            fileName: file.name,
            folderName: folder,
          }))}
          filter={filter}
          AppObjectComponent={ArchiveFileAppObject}
        />
      </WidgetsInnerContainer>
    </>
  );
}

export default function ArchiveWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Archive folders" name="folders" height="50%">
        <ArchiveFolderList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Archive files" name="files">
        <ArchiveFilesList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
