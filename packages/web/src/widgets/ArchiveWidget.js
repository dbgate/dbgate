import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useCurrentArchive, useOpenedTabs, useSavedSqlFiles, useSetCurrentArchive } from '../utility/globalState';
import closedTabAppObject from '../appobj/closedTabAppObject';
import {
  SearchBoxWrapper,
  WidgetsInnerContainer,
  WidgetsMainContainer,
  WidgetsOuterContainer,
  WidgetTitle,
} from './WidgetStyles';
import savedSqlFileAppObject from '../appobj/savedSqlFileAppObject';
import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
import archiveFolderAppObject from '../appobj/archiveFolderAppObject';
import archiveFileAppObject from '../appobj/archiveFileAppObject';
import SearchInput from './SearchInput';
import InlineButton from './InlineButton';
import axios from '../utility/axios';

function ArchiveFolderList() {
  const folders = useArchiveFolders();
  const inputRef = React.useRef(null);
  const [filter, setFilter] = React.useState('');

  const setArchive = useSetCurrentArchive();

  const handleRefreshFolders = () => {
    axios.post('archive/refresh-folders', {});
  };

  return (
    <>
      <WidgetTitle inputRef={inputRef}>Archive folder</WidgetTitle>
      <SearchBoxWrapper>
        <SearchInput inputRef={inputRef} placeholder="Search archive folders" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshFolders}>Refresh</InlineButton>
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        <AppObjectList
          list={_.sortBy(folders, 'name')}
          makeAppObj={archiveFolderAppObject()}
          onObjectClick={(archive) => setArchive(archive.name)}
          filter={filter}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function ArchiveFilesList() {
  const folder = useCurrentArchive();
  const files = useArchiveFiles({ folder });
  const inputRef = React.useRef(null);
  const [filter, setFilter] = React.useState('');
  const handleRefreshFiles = () => {
    axios.post('archive/refresh-files', { folder });
  };

  return (
    <>
      <WidgetTitle inputRef={inputRef}>Archive files</WidgetTitle>
      <SearchBoxWrapper>
        <SearchInput inputRef={inputRef} placeholder="Search archive files" filter={filter} setFilter={setFilter} />
        <InlineButton onClick={handleRefreshFiles}>Refresh</InlineButton>
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        <AppObjectList
          list={(files || []).map((file) => ({
            fileName: file.name,
            folderName: folder,
          }))}
          filter={filter}
          makeAppObj={archiveFileAppObject()}
        />
      </WidgetsInnerContainer>
    </>
  );
}

export default function ArchiveWidget() {
  return (
    <WidgetsMainContainer>
      <WidgetsOuterContainer>
        <ArchiveFolderList />
      </WidgetsOuterContainer>
      <WidgetsOuterContainer>
        <ArchiveFilesList />
      </WidgetsOuterContainer>
    </WidgetsMainContainer>
  );
}
