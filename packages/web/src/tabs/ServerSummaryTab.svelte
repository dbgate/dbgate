<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ServerSummaryTab');

  registerCommand({
    id: 'serverSummary.refresh',
    category: 'Server sumnmary',
    name: _t('common.refresh', { defaultMessage: 'Refresh' }),
    keyText: 'F5 | CtrlOrCommand+R',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon reload',
    onClick: () => getCurrentEditor().refresh(),
    testEnabled: () => getCurrentEditor() != null,
  });
</script>

<script>
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import registerCommand from '../commands/registerCommand';
  import Link from '../elements/Link.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import formatFileSize from '../utility/formatFileSize';
  import openNewTab from '../utility/openNewTab';

  export let conid;

  let refreshToken = 0;

  export const activator = createActivator('ServerSummaryTab', true);

  export function refresh() {
    refreshToken += 1;
  }

  async function runAction(action, row) {
    const { command, openQuery, openTab, addDbProps } = action;
    if (command) {
      await apiCall('server-connections/summary-command', { conid, refreshToken, command, row });
      refresh();
    }
    if (openQuery) {
      openNewTab({
        title: action.tabTitle || row.name,
        icon: 'img query-data',
        tabComponent: 'QueryDataTab',
        props: {
          conid,
          database: row.name,
          sql: openQuery,
        },
      });
    }
    if (openTab) {
      const props = {};
      if (addDbProps) {
        props['conid'] = conid;
        props['database'] = row.name;
      }
      openNewTab({
        ...openTab,
        props: {
          ...openTab.props,
          ...props,
        },
      });
    }
  }
</script>

<ToolStripContainer>
  {#await apiCall('server-connections/server-summary', { conid, refreshToken })}
    <LoadingInfo message="Loading server details" wrapper />
  {:then summary}
    <div class="wrapper">
      <ObjectListControl
        collection={summary.databases}
        hideDisplayName
        title={`Databases (${summary.databases.length})`}
        emptyMessage={'No databases'}
        columns={summary.columns.map(col => ({
          ...col,
          slot: col.columnType == 'bytes' ? 1 : col.columnType == 'actions' ? 2 : null,
        }))}
      >
        <svelte:fragment slot="1" let:row let:col>{formatFileSize(row?.[col.fieldName])}</svelte:fragment>
        <svelte:fragment slot="2" let:row let:col>
          {#each col.actions as action, index}
            {#if index > 0}
              <span class="action-separator">|</span>
            {/if}
            <Link onClick={() => runAction(action, row)}>{action.header}</Link>
          {/each}
        </svelte:fragment>
      </ObjectListControl>
    </div>
  {/await}

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="serverSummary.refresh" />
  </svelte:fragment>
</ToolStripContainer>

<style>
  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-bg-0);
    overflow: auto;
  }

  .action-separator {
    margin: 0 5px;
  }
</style>
