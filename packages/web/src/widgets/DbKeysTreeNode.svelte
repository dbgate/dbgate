<script lang="ts">
  import { getIconForRedisType } from 'dbgate-tools';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import newQuery from '../query/newQuery';
  import { activeDbKeysStore } from '../stores';
  import { apiCall } from '../utility/api';
  import openNewTab from '../utility/openNewTab';

  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;

  export let root;

  export let item;
  export let indentLevel = 0;

  export let onRefreshParent;

  let isExpanded;
  let reloadToken = 0;

  // $: console.log(item.text, indentLevel);
  function createMenu() {
    return [
      item.key != null && {
        label: 'Delete key',
        onClick: () => {
          showModal(ConfirmModal, {
            message: `Really delete key ${item.key}?`,
            onConfirm: async () => {
              await apiCall('database-connections/call-method', {
                conid,
                database,
                method: 'del',
                args: [item.key],
              });

              if (onRefreshParent) {
                onRefreshParent();
              }
            },
          });
        },
      },
      item.key != null && {
        label: 'Rename key',
        onClick: () => {
          showModal(InputTextModal, {
            value: item.key,
            label: 'New name',
            header: 'Rename key',
            onConfirm: async newName => {
              await apiCall('database-connections/call-method', {
                conid,
                database,
                method: 'rename',
                args: [item.key, newName],
              });

              if (onRefreshParent) {
                onRefreshParent();
              }
            },
          });
        },
      },
      item.type == 'dir' && {
        label: 'Reload',
        onClick: () => {
          reloadToken += 1;
        },
      },
      item.type == 'dir' && {
        label: 'Delete branch',
        onClick: () => {
          const branch = `${item.root}:*`;
          showModal(ConfirmModal, {
            message: `Really delete branch ${branch} with all keys?`,
            onConfirm: async () => {
              await apiCall('database-connections/call-method', {
                conid,
                database,
                method: 'mdel',
                args: [branch],
              });

              if (onRefreshParent) {
                onRefreshParent();
              }
            },
          });
        },
      },
      ,
      {
        label: 'Generate script',
        onClick: async () => {
          const data = await apiCall('database-connections/export-keys', {
            conid,
            database,
            options: {
              keyPrefix: item.root || item.key,
            },
          });

          newQuery({
            title: 'Export #',
            initialData: data,
          });
        },
      },
    ];
  }
</script>

<AppObjectCore
  icon={getIconForRedisType(item.type)}
  title={item.text}
  expandIcon={item.type == 'dir' ? plusExpandIcon(isExpanded) : 'icon invisible-box'}
  on:expand={() => {
    if (item.type == 'dir') {
      isExpanded = !isExpanded;
    }
  }}
  on:click={() => {
    if (item.type == 'dir') {
      isExpanded = !isExpanded;
    } else {
      openNewTab({
        tabComponent: 'DbKeyDetailTab',
        title: 'Key: ' + database,
        props: {
          isDefaultBrowser: true,
          conid,
          database,
        },
      });
      $activeDbKeysStore = {
        ...$activeDbKeysStore,
        [`${conid}:${database}`]: item.key,
      };
    }
  }}
  extInfo={item.count ? `(${item.count})` : null}
  {indentLevel}
  menu={createMenu}
/>
<!-- <div on:click={() => (isExpanded = !isExpanded)}>
  <FontIcon icon={} />
  {item.text}
</div> -->

{#if isExpanded}
  <DbKeysSubTree {conid} {database} root={item.root} indentLevel={indentLevel + 1} {reloadToken} />
{/if}
