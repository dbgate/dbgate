<script lang="ts">
  import { getIconForRedisType } from 'dbgate-tools';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { activeDbKeysStore } from '../stores';
  import { apiCall } from '../utility/api';
  import openNewTab from '../utility/openNewTab';

  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;

  export let root;

  export let item;
  export let indentLevel = 0;

  let isExpanded;

  // $: console.log(item.text, indentLevel);
  function createMenu() {
    return [
      item.key != null && {
        label: 'Delete',
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
            },
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
  <DbKeysSubTree {conid} {database} root={item.root} indentLevel={indentLevel + 1} />
{/if}
