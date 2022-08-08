<script lang="ts">
  import _ from 'lodash';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as savedFileAppObject from '../appobj/SavedFileAppObject.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { useFiles } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  const sqlFiles = useFiles({ folder: 'sql' });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });
  const sqliteFiles = useFiles({ folder: 'sqlite' });
  const diagramFiles = useFiles({ folder: 'diagrams' });
  const perspectiveFiles = useFiles({ folder: 'perspectives' });

  $: files = [
    ...($sqlFiles || []),
    ...($shellFiles || []),
    ...($markdownFiles || []),
    ...($chartFiles || []),
    ...($queryFiles || []),
    ...($sqliteFiles || []),
    ...($diagramFiles || []),
    ...($perspectiveFiles || []),
  ];

  function handleRefreshFiles() {
    apiCall('files/refresh', {
      folders: ['sql', 'shell', 'markdown', 'charts', 'query', 'sqlite', 'diagrams', 'perspectives'],
    });
  }
</script>

<WidgetsInnerContainer>
  <SearchBoxWrapper>
    <SearchInput placeholder="Search saved files" bind:value={filter} />
    <CloseSearchButton bind:filter />
    <InlineButton on:click={handleRefreshFiles} title="Refresh files">
      <FontIcon icon="icon refresh" />
    </InlineButton>
  </SearchBoxWrapper>

  <AppObjectList list={files} module={savedFileAppObject} groupFunc={data => _.startCase(data.folder)} {filter} />
</WidgetsInnerContainer>
