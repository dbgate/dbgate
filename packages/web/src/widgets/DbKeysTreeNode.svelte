<script lang="ts">
  import {
    dbKeys_clearLoadedData,
    dbKeys_markNodeExpanded,
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
  import { _t } from '../translations';

  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;
  export let connection;

  export let key;

  export let item;
  export let indentLevel = 0;
  export let filter;
  export let parentRoots = [];

  export let model: DbKeysTreeModel;
  export let changeModel: DbKeysChangeModelFunction;

  $: isExpanded = model.dirStateByKey[item.key]?.isExpanded;

  // $: console.log(item.text, indentLevel);
  function createMenu() {
    return [
      item.key != null &&
        !connection?.isReadOnly && {
          label: _t('dbKeysTreeNode.deleteKey', { defaultMessage: 'Delete key' }),
          onClick: () => {
            showModal(ConfirmModal, {
              message: _t('dbKeysTreeNode.deleteKeyConfirm', { defaultMessage: 'Really delete key {key}?', values: { key: item.key } }),
              onConfirm: async () => {
                await apiCall('database-connections/call-method', {
                  conid,
                  database,
                  method: 'del',
                  args: [item.key],
                });

                changeModel(m => dbKeys_clearLoadedData(m), true);
              },
            });
          },
        },
      item.key != null &&
        !connection?.isReadOnly && {
          label: _t('dbKeysTreeNode.renameKey', { defaultMessage: 'Rename key' }),
          onClick: () => {
            showModal(InputTextModal, {
              value: item.key,
              label: _t('dbKeysTreeNode.newName', { defaultMessage: 'New name' }),
              header: _t('dbKeysTreeNode.renameKey', { defaultMessage: 'Rename key' }),
              onConfirm: async newName => {
                await apiCall('database-connections/call-method', {
                  conid,
                  database,
                  method: 'rename',
                  args: [item.key, newName],
                });

                changeModel(m => dbKeys_clearLoadedData(m), true);
              },
            });
          },
        },
      // item.type == 'dir' &&
      //   !connection?.isReadOnly && {
      //     label: 'Reload',
      //     onClick: () => {
      //       changeModel(m => dbKeys_clearLoadedData(m), true);
      //     },
      //   },
      item.type == 'dir' &&
        !connection?.isReadOnly && {
          label: _t('dbKeysTreeNode.deleteBranch', { defaultMessage: 'Delete branch' }),
          onClick: () => {
            const branch = `${item.key}:*`;
            showModal(ConfirmModal, {
              message: _t('dbKeysTreeNode.deleteBranchConfirm', { defaultMessage: 'Really delete branch {branch} with all keys?', values: { branch } }),
              onConfirm: async () => {
                await apiCall('database-connections/call-method', {
                  conid,
                  database,
                  method: 'mdel',
                  args: [branch],
                });

                changeModel(m => dbKeys_clearLoadedData(m), true);
              },
            });
          },
        },
      ,
      {
        label: _t('dbKeysTreeNode.generateScript', { defaultMessage: 'Generate script' }),
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
            title: _t('dbKeysTreeNode.exportTitle', { defaultMessage: 'Export #' }),
            initialData: data,
          });
        },
      },
    ];
  }
</script>

<AppObjectCore
  icon={getIconForRedisType(item.type)}
  title={item.text || _t('dbKeysTreeNode.noName', { defaultMessage: '(no name)' })}
  expandIcon={item.type == 'dir' ? plusExpandIcon(isExpanded) : 'icon invisible-box'}
  on:expand={() => {
    if (item.type == 'dir') {
      changeModel(tree => dbKeys_markNodeExpanded(tree, item.key, !isExpanded), false);
    }
  }}
  on:click={() => {
    if (item.type == 'dir') {
      changeModel(tree => dbKeys_markNodeExpanded(tree, item.key, !isExpanded), false);
    } else {
      openNewTab({
        tabComponent: 'DbKeyDetailTab',
        title: item.text || _t('dbKeysTreeNode.noName', { defaultMessage: '(no name)' }),
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

{#if isExpanded && !parentRoots.includes(item.root)}
  <DbKeysSubTree
    {conid}
    {database}
    key={item.key}
    indentLevel={indentLevel + 1}
    {connection}
    {filter}
    {model}
    {changeModel}
    {parentRoots}
  />
{/if}
