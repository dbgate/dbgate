<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as cloudFileAppObject from '../appobj/CloudFileAppObject.svelte';
  import { usePublicCloudFiles } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';

  let filter = '';

  $: publicFiles = usePublicCloudFiles();

  async function handleRefreshPublic() {
    await apiCall('cloud/refresh-public-files');
  }
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Public cloud" name="cloud" height="70%" storageName="publicCloudItems">
    <WidgetsInnerContainer>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search cloud files" bind:value={filter} />
        <CloseSearchButton bind:filter />
        <InlineButton on:click={handleRefreshPublic} title="Refresh files" data-testid="SavedFileList_buttonRefresh">
          <FontIcon icon="icon refresh" />
        </InlineButton>
      </SearchBoxWrapper>

      <AppObjectList
        list={$publicFiles || []}
        module={cloudFileAppObject}
        groupFunc={data => data.folder || undefined}
        {filter}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  <WidgetColumnBarItem title="Favorites" name="favorites" storageName="favoritesWidget"></WidgetColumnBarItem>
</WidgetColumnBar>
