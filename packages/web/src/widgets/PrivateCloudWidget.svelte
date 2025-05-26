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
  import {
    cloudConnectionsStore,
    cloudSigninTokenHolder,
    currentDatabase,
    expandedConnections,
    openedConnections,
    openedSingleDatabaseConnections,
  } from '../stores';
  import _ from 'lodash';
  import { plusExpandIcon } from '../icons/expandIcons';
  import { volatileConnectionMapStore } from '../utility/api';
  import SubCloudItemsList from '../appobj/SubCloudItemsList.svelte';
  import DatabaseWidgetDetailContent from './DatabaseWidgetDetailContent.svelte';
  import { onMount } from 'svelte';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { showSnackbarInfo } from '../utility/snackbar';

  let publicFilter = '';
  let cloudFilter = '';
  let domSqlObjectList = null;

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
  $: contentGroupMap = _.keyBy($cloudContentList || [], x => x.folid);

  // $: console.log('cloudContentFlat', cloudContentFlat);
  // $: console.log('contentGroupMap', contentGroupMap);

  async function handleRefreshContent() {
    await apiCall('cloud/refresh-content');
  }

  async function loadCloudConnection(conid) {
    const conn = await apiCall('connections/get', { conid });
    $cloudConnectionsStore = {
      ...$cloudConnectionsStore,
      [conid]: conn,
    };
  }

  function ensureCloudConnectionsLoaded(...conids) {
    _.uniq(conids).forEach(conid => {
      if (conid?.startsWith('cloud://') && !$cloudConnectionsStore[conid]) {
        loadCloudConnection(conid);
      }
    });
  }

  $: ensureCloudConnectionsLoaded(
    $currentDatabase?.connection?._id,
    ...$openedSingleDatabaseConnections,
    ...$openedConnections
  );

  // onMount(() => {
  //   const currentConid = $currentDatabase?.connection?._id;
  //   if (currentConid?.startsWith('cloud://') && !$cloudConnectionsStore[currentConid]) {
  //     loadCloudConnection(currentConid);
  //   }
  // });

  function createAddMenu() {
    return [
      {
        text: 'New shared folder',
        onClick: () => {
          showModal(InputTextModal, {
            label: 'New folder name',
            header: 'New shared folder',
            onConfirm: async newFolder => {
              apiCall('cloud/create-folder', {
                name: newFolder,
              });
            },
          });
        },
      },
      {
        text: 'Add existing shared folder',
        onClick: () => {
          showModal(InputTextModal, {
            label: 'Your invite link (in form dbgate://folder/xxx)',
            header: 'Add existing shared folder',
            onConfirm: async newFolder => {
              apiCall('cloud/grant-folder', {
                inviteLink: newFolder,
              });
            },
          });
        },
      },
      {
        command: 'new.connectionOnCloud',
      },
    ];
  }

  function createGroupContextMenu(folder) {
    const handleRename = () => {
      showModal(InputTextModal, {
        value: contentGroupMap[folder]?.name,
        label: 'New folder name',
        header: 'Rename folder',
        onConfirm: async name => {
          apiCall('cloud/rename-folder', {
            folid: folder,
            name,
          });
        },
      });
    };

    const handleDelete = () => {
      showModal(ConfirmModal, {
        message: `Really delete folder ${contentGroupMap[folder]?.name}? All folder content will be deleted!`,
        header: 'Delete folder',
        onConfirm: () => {
          apiCall('cloud/delete-folder', {
            folid: folder,
          });
        },
      });
    };

    const handleCopyInviteLink = async role => {
      const { inviteToken } = await apiCall(`cloud/get-invite-token`, {
        folid: folder,
        role,
      });
      const inviteLink = `dbgate://folder/v1/${inviteToken}?mode=${role}`;
      navigator.clipboard.writeText(inviteLink);
      showSnackbarInfo(`Invite link (${role}) copied to clipboard`);
    };

    return [
      contentGroupMap[folder]?.role == 'admin' && [
        { text: 'Rename', onClick: handleRename },
        { text: 'Delete', onClick: handleDelete },
      ],
      contentGroupMap[folder]?.role == 'admin' &&
        !contentGroupMap[folder]?.isPrivate && {
          text: 'Copy invite link',
          submenu: [
            {
              text: 'Admin',
              onClick: () => handleCopyInviteLink('admin'),
            },
            {
              text: 'Write',
              onClick: () => handleCopyInviteLink('write'),
            },
            {
              text: 'Read',
              onClick: () => handleCopyInviteLink('read'),
            },
          ],
        },
    ];
  }
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem
    title="DbGate Cloud"
    name="privateCloud"
    height="50%"
    storageName="privateCloudItems"
    skip={!$cloudSigninTokenHolder}
  >
    <SearchBoxWrapper>
      <SearchInput placeholder="Search cloud connections and files" bind:value={cloudFilter} />
      <CloseSearchButton bind:filter={cloudFilter} />
      <DropDownButton icon="icon plus-thick" menu={createAddMenu} />
      <InlineButton
        on:click={handleRefreshContent}
        title="Refresh files"
        data-testid="CloudItemsWidget_buttonRefreshContent"
      >
        <FontIcon icon="icon refresh" />
      </InlineButton>
    </SearchBoxWrapper>
    <WidgetsInnerContainer>
      <AppObjectList
        list={cloudContentFlat || []}
        module={cloudContentAppObject}
        emptyGroupNames={emptyCloudContent}
        groupFunc={data => data.folid}
        mapGroupTitle={folid => contentGroupMap[folid]?.name}
        filter={publicFilter}
        subItemsComponent={() => SubCloudItemsList}
        expandIconFunc={plusExpandIcon}
        isExpandable={data =>
          data.conid &&
          $cloudConnectionsStore[data.conid] &&
          !$cloudConnectionsStore[data.conid].singleDatabase &&
          $openedConnections.includes(data.conid)}
        getIsExpanded={data => $expandedConnections.includes(data.conid)}
        setIsExpanded={(data, value) => {
          expandedConnections.update(old => (value ? [...old, data.conid] : old.filter(x => x != data.conid)));
        }}
        passProps={{
          onFocusSqlObjectList: () => domSqlObjectList.focus(),
        }}
        groupContextMenu={createGroupContextMenu}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  <DatabaseWidgetDetailContent bind:domSqlObjectList showCloudConnection={true} />
</WidgetColumnBar>
