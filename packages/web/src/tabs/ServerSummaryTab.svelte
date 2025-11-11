<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ServerSummaryTab');

  registerCommand({
    id: 'serverSummary.refresh',
    category: __t('command.serverSummary', { defaultMessage: 'Server summary' }),
    name: __t('common.refresh', { defaultMessage: 'Refresh' }),
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
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import TabControl from '../elements/TabControl.svelte';

  import { _t, __t } from '../translations';
  import { apiCall } from '../utility/api';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import openNewTab from '../utility/openNewTab';
  import SummaryVariables from '../widgets/SummaryVariables.svelte';
  import SummaryProcesses from '../widgets/SummaryProcesses.svelte';
  import SummaryDatabases from '../widgets/SummaryDatabases.svelte';
  import { activeTabId, serverSummarySelectedTab } from '../stores';
  import { getContext } from 'svelte';

  export let conid;
  const tabid = getContext('tabid');
  $: isActiveTab = tabid === $activeTabId;

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
    <LoadingInfo
      message={_t('serverSummaryTab.loadingMessage', { defaultMessage: 'Loading server details' })}
      wrapper
    />
  {:then summary}
    {#if 'errorMessage' in summary}
      <div class="wrapper error-wrapper">
        <div class="error-message">
          <h3>{_t('serverSummaryTab.errorTitle', { defaultMessage: 'Error loading server summary' })}</h3>
          <p>{summary.errorMessage}</p>
        </div>
      </div>
    {:else}
      <div class="wrapper">
        <TabControl
          isInline
          inlineTabs
          containerMaxWidth="100%"
          containerMaxHeight="calc(100% - 34px)"
          maxHeight100
          flex1
          flexColContainer
          value={$serverSummarySelectedTab}
          onUserChange={index => serverSummarySelectedTab.set(index)}
          tabs={[
            {
              label: _t('serverSummaryTab.variables', { defaultMessage: 'Variables' }),
              component: SummaryVariables,
              props: { variables: summary.variables || [] },
            },
            {
              label: _t('serverSummaryTab.processes', { defaultMessage: 'Processes' }),
              component: SummaryProcesses,
              props: {
                processes: summary.processes || [],
                isSummaryOpened: isActiveTab,
                conid,
              },
            },
            {
              label: _t('serverSummaryTab.databases', { defaultMessage: 'Databases' }),
              component: SummaryDatabases,
              props: { rows: summary.databases?.rows ?? [], columns: summary.databases?.columns ?? [] },
            },
          ]}
        />
      </div>
    {/if}
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
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .action-separator {
    margin: 0 5px;
  }

  .error-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .error-message {
    background: var(--theme-bg-1);
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    padding: 20px;
    max-width: 500px;
    text-align: center;
  }

  .error-message h3 {
    color: var(--theme-font-error);
    margin-top: 0;
  }
</style>
