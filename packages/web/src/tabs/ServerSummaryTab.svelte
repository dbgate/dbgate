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
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import TabControl from '../elements/TabControl.svelte';

  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import openNewTab from '../utility/openNewTab';
  import SummaryVariables from '../widgets/SummaryVariables.svelte';
  import SummaryProcesses from '../widgets/SummaryProcesses.svelte';
  import SummaryDatabases from '../widgets/SummaryDatabases.svelte';
  import { serverSummarySelectedTab } from '../stores';

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
      <TabControl
        isInline
        inlineTabs={true}
        containerMaxWidth="100%"
        flex1={true}
        value={$serverSummarySelectedTab}
        onUserChange={(index) => serverSummarySelectedTab.set(index)}
        tabs={[
          {
            label: 'Variables',
            component: SummaryVariables,
            props: { variables: summary.variables || [] },
          },
          {
            label: 'Processes',
            component: SummaryProcesses,
            props: { processes: summary.processes || [], conid },
          },
          {
            label: 'Databases',
            component: SummaryDatabases,
            props: { rows: summary.databases?.rows ?? [], columns: summary.databases?.columns ?? [] },
          },
        ]}
      />
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
