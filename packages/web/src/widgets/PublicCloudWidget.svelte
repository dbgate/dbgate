<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as publicCloudFileAppObject from '../appobj/PublicCloudFileAppObject.svelte';
  import * as cloudContentAppObject from '../appobj/CloudContentAppObject.svelte';
  import { useCloudContentList, usePublicCloudFiles, useServerStatus } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import _ from 'lodash';
  let filter = '';

  const publicFiles = usePublicCloudFiles();

  async function handleRefreshPublic() {
    await apiCall('cloud/refresh-public-files?isRefresh=1');
  }
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Public Knowledge Base" name="publicCloud" storageName="publicCloudItems">
    <WidgetsInnerContainer>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search public files" bind:value={filter} />
        <CloseSearchButton bind:filter />
        <InlineButton
          on:click={handleRefreshPublic}
          title="Refresh files"
          data-testid="CloudItemsWidget_buttonRefreshPublic"
        >
          <FontIcon icon="icon refresh" />
        </InlineButton>
      </SearchBoxWrapper>

      <AppObjectList
        list={$publicFiles || []}
        module={publicCloudFileAppObject}
        groupFunc={data => data.folder || "Not defined"}
        {filter}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
