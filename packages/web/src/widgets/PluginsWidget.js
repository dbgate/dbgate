import React from 'react';
import { SearchBoxWrapper, WidgetsInnerContainer } from './WidgetStyles';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useInstalledPlugins } from '../utility/metadataLoaders';
import SearchInput from './SearchInput';
import useFetch from '../utility/useFetch';
import PluginsList from '../plugins/PluginsList';

function InstalledPluginsList() {
  const plugins = useInstalledPlugins();

  return (
    <WidgetsInnerContainer>
      <PluginsList plugins={plugins} />
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
