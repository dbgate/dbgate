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

function ArchiveFolderList() {
  const folders = useArchiveFolders();

  const setArchive = useSetCurrentArchive();

  return (
    <>
      <WidgetTitle>Archive folder</WidgetTitle>
      <WidgetsInnerContainer>
        <AppObjectList
          list={_.sortBy(folders, 'name')}
          makeAppObj={archiveFolderAppObject()}
          onObjectClick={(archive) => setArchive(archive.name)}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function ArchiveFilesList() {
  const folder = useCurrentArchive();
  const files = useArchiveFiles({ folder });

  return (
    <>
      <WidgetTitle>Archive files</WidgetTitle>
      <WidgetsInnerContainer>
        <AppObjectList
          list={(files || []).map((file) => ({
            fileName: file.name,
            folderName: folder,
          }))}
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
