<script lang="ts">
  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as publicCloudFileAppObject from '../appobj/PublicCloudFileAppObject.svelte';
  import { usePublicCloudFiles } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { refreshPublicCloudFiles } from '../utility/api';
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  let filter = '';

  const publicFiles = usePublicCloudFiles();

  function handleRefreshPublic() {
    refreshPublicCloudFiles(true);
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
        groupFunc={data => data.folder || 'Not defined'}
        {filter}
      />

      {#if !$publicFiles?.length}
        <ErrorInfo message="No files found for your configuration" />
        <div class="error-info">
          <div class="m-1">
            Only files relevant for your connections, platform and DbGate edition are listed. Please define connections at first.
          </div>
          <FormStyledButton value={`Refresh list`} skipWidth on:click={handleRefreshPublic} />
        </div>
      {/if}
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>

<style>
  .error-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin-top: 10px;
  }
</style>
