<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as cloudFileAppObject from '../appobj/CloudFileAppObject.svelte';
  import { useCloudContentList, usePublicCloudFiles } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { cloudSigninToken } from '../stores';
  import _ from 'lodash';

  let publicFilter = '';
  let cloudFilter = '';

  $: publicFiles = usePublicCloudFiles();
  $: cloudContentList = useCloudContentList();

  $: emptyCloudContent = ($cloudContentList || []).filter(x => !x.items?.length).map(x => x.folid);
  $: cloudContentFlat = ($cloudContentList || []).flatMap(fld => fld.items ?? []).map(x => x.folid);
  $: contentGroupTitleMap = _.fromPairs(($cloudContentList || []).map(x => [x.folid, x.name]));

  async function handleRefreshPublic() {
    await apiCall('cloud/refresh-public-files');
  }

  async function handleRefreshContent() {
    await apiCall('cloud/refresh-content');
  }
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem
    title="DbGate Cloud"
    name="privateCloud"
    height="50%"
    storageName="privateCloudItems"
    skip={!$cloudSigninToken}
  >
    <WidgetsInnerContainer>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search cloud items" bind:value={cloudFilter} />
        <CloseSearchButton bind:filter={cloudFilter} />
        <InlineButton
          on:click={handleRefreshContent}
          title="Refresh files"
          data-testid="CloudItemsWidget_buttonRefreshContent"
        >
          <FontIcon icon="icon refresh" />
        </InlineButton>
      </SearchBoxWrapper>

      <AppObjectList
        list={cloudContentFlat || []}
        module={cloudFileAppObject}
        emptyGroupNames={emptyCloudContent}
        groupFunc={data => data.folid}
        mapGroupTitle={folid => contentGroupTitleMap[folid]}
        filter={publicFilter}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  <WidgetColumnBarItem title="Public Knowledge Base" name="publicCloud" storageName="publicCloudItems">
    <WidgetsInnerContainer>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search public files" bind:value={publicFilter} />
        <CloseSearchButton bind:filter={publicFilter} />
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
        module={cloudFileAppObject}
        groupFunc={data => data.folder || undefined}
        filter={publicFilter}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
