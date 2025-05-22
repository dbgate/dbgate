<script lang="ts">
  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
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
  import { cloudConnectionsStore, cloudSigninToken, expandedConnections, openedConnections } from '../stores';
  import _ from 'lodash';
  import { plusExpandIcon } from '../icons/expandIcons';
  import { volatileConnectionMapStore } from '../utility/api';
  import SubCloudItemsList from '../appobj/SubCloudItemsList.svelte';

  let publicFilter = '';
  let cloudFilter = '';

  const cloudContentList = useCloudContentList();
  const serverStatus = useServerStatus();

  $: emptyCloudContent = ($cloudContentList || []).filter(x => !x.items?.length).map(x => x.folid);
  $: cloudContentFlat = ($cloudContentList || [])
    .flatMap(fld => fld.items ?? [])
    .map(data => {
      if (data.type == 'connection') {
        const conid = `cloud://${data.folid}/${data.cntid}`;
        const status = $serverStatus ? $serverStatus[$volatileConnectionMapStore[conid] || conid] : undefined;

        return {
          ...data,
          conid,
          status,
        };
      }

      return data;
    });
  $: contentGroupTitleMap = _.fromPairs(($cloudContentList || []).map(x => [x.folid, x.name]));

  $: console.log('cloudContentFlat', cloudContentFlat);

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
        module={cloudContentAppObject}
        emptyGroupNames={emptyCloudContent}
        groupFunc={data => data.folid}
        mapGroupTitle={folid => contentGroupTitleMap[folid]}
        filter={publicFilter}
        subItemsComponent={() => SubCloudItemsList}
        expandIconFunc={plusExpandIcon}
        isExpandable={data =>
          data.conid &&
          $cloudConnectionsStore[data.conid] &&
          !$cloudConnectionsStore[data.conid].singleDatabase &&
          $openedConnections.includes(data.conid)}
        getIsExpanded={data => $expandedConnections.includes(data.conid) && !data.singleDatabase}
        setIsExpanded={(data, value) => {
          expandedConnections.update(old => (value ? [...old, data.conid] : old.filter(x => x != data.conid)));
        }}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
