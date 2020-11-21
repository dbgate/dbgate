import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useCurrentArchive, useSetCurrentArchive } from '../utility/globalState';
import { SearchBoxWrapper, WidgetsInnerContainer } from './WidgetStyles';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
import archiveFolderAppObject from '../appobj/archiveFolderAppObject';
import archiveFileAppObject from '../appobj/archiveFileAppObject';
import SearchInput from './SearchInput';
import InlineButton from './InlineButton';
import axios from '../utility/axios';
import useFetch from '../utility/useFetch';
import PluginsList from '../plugins/PluginsList';

function InstalledPluginsList() {
  //   const folders = useArchiveFolders();
  //   const [filter, setFilter] = React.useState('');

  //   const setArchive = useSetCurrentArchive();

  //   const handleRefreshFolders = () => {
  //     axios.post('archive/refresh-folders', {});
  //   };

  return (
    <WidgetsInnerContainer>
      {/* <AppObjectList
        list={_.sortBy(folders, 'name')}
        makeAppObj={archiveFolderAppObject()}
        onObjectClick={(archive) => setArchive(archive.name)}
        filter={filter}
      /> */}
    </WidgetsInnerContainer>
  );
}

function AvailablePluginsList() {
  const [filter, setFilter] = React.useState('');

  const plugins = useFetch({
    url: 'plugins/search',
    params: {
      filter,
    },
    defaultValue: [],
  });

  return (
    <>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search extensions on web" filter={filter} setFilter={setFilter} />
      </SearchBoxWrapper>
      <WidgetsInnerContainer>
        <PluginsList plugins={plugins} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function PluginsWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Installed extensions" name="installed" height="50%">
        <InstalledPluginsList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Available extensions" name="all">
        <AvailablePluginsList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
