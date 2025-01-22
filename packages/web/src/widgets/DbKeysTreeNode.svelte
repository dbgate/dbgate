<script lang="ts">
  import {
    dbKeys_markNodeExpanded,
    dbKeys_reloadFolder,
    DbKeysChangeModelFunction,
    DbKeysTreeModel,
    getIconForRedisType,
  } from 'dbgate-tools';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import newQuery from '../query/newQuery';
  import { activeDbKeysStore, focusedTreeDbKey } from '../stores';
  import { apiCall } from '../utility/api';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import _ from 'lodash';
  import openNewTab from '../utility/openNewTab';
  import { showSnackbarError } from '../utility/snackbar';

  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;
  export let connection;

  export let root;

  export let item;
  export let indentLevel = 0;
  export let filter;

  export let model: DbKeysTreeModel;
  export let changeModel: DbKeysChangeModelFunction;

  $: isExpanded = model.dirsByKey[item.root]?.isExpanded;

  // $: console.log(item.text, indentLevel);
  function createMenu() {
    return [
      item.key != null &&
        !connection?.isReadOnly && {
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

                changeModel(m => dbKeys_reloadFolder(m, root));
              },
            });
          },
        },
      item.key != null &&
        !connection?.isReadOnly && {
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

                changeModel(m => dbKeys_reloadFolder(m, root));
              },
            });
          },
        },
      item.type == 'dir' &&
        !connection?.isReadOnly && {
          label: 'Reload',
          onClick: () => {
            changeModel(m => dbKeys_reloadFolder(m, root));
          },
        },
      item.type == 'dir' &&
        !connection?.isReadOnly && {
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

                changeModel(m => dbKeys_reloadFolder(m, root));
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

          if (data.errorMessage) {
            showSnackbarError(data.errorMessage);
            return;
          }

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
  title={item.text || '(no name)'}
  expandIcon={item.type == 'dir' ? plusExpandIcon(isExpanded) : 'icon invisible-box'}
  on:expand={() => {
    if (item.type == 'dir') {
      changeModel(tree => dbKeys_markNodeExpanded(tree, item.root, !isExpanded));
    }
  }}
  on:click={() => {
    if (item.type == 'dir') {
      changeModel(tree => dbKeys_markNodeExpanded(tree, item.root, !isExpanded));
    } else {
      openNewTab({
        tabComponent: 'DbKeyDetailTab',
        title: item.text || '(no name)',
        icon: 'img keydb',
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
  on:mousedown={() => {
    $focusedTreeDbKey = _.pick(item, ['type', 'key', 'root', 'text']);
  }}
  extInfo={item.count ? `(${item.count})` : null}
  {indentLevel}
  menu={createMenu}
  isChoosed={$focusedTreeDbKey &&
    item.key == $focusedTreeDbKey.key &&
    item.root == $focusedTreeDbKey.root &&
    item.type == $focusedTreeDbKey.type}
/>
<!-- <div on:click={() => (isExpanded = !isExpanded)}>
  <FontIcon icon={} />
  {item.text}
</div> -->

{#if isExpanded}
  <DbKeysSubTree
    {conid}
    {database}
    root={item.root}
    indentLevel={indentLevel + 1}
    {connection}
    {filter}
    {model}
    {changeModel}
  />
{/if}
