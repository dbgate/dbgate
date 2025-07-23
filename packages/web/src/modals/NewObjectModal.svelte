<script lang="ts">
  import NewObjectButton from '../buttons/NewObjectButton.svelte';
  import runCommand from '../commands/runCommand';
  import newQuery from '../query/newQuery';
  import { commandsCustomized, selectedWidget } from '../stores';
  import { isProApp } from '../utility/proTools';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let multiTabIndex = undefined;

  let NEW_ITEMS = [
    {
      icon: 'icon sql-file',
      colorClass: 'color-icon-blue',
      title: 'Query',
      description: 'SQL query editor',
      action: () => {
        newQuery({ multiTabIndex });
      },
      testid: 'NewObjectModal_query',
    },
    {
      icon: 'icon connection',
      colorClass: 'color-icon-yellow',
      title: 'Connection',
      description: 'Database connection stored locally',
      command: 'new.connection',
      changeWidget: 'database',
      testid: 'NewObjectModal_connection',
      disabledMessage: 'You are not allowed to create new connections',
    },
    {
      icon: 'icon cloud-connection',
      colorClass: 'color-icon-blue',
      title: 'Connection on Cloud',
      description: 'Database connection stored on DbGate Cloud',
      command: 'new.connectionOnCloud',
      changeWidget: 'cloud-private',
      testid: 'NewObjectModal_connectionOnCloud',
      disabledMessage: 'For creating connections on DbGate Cloud, you need to be logged in',
    },
    {
      icon: 'icon query-design',
      colorClass: 'color-icon-red',
      title: 'Query Designer',
      description: 'Design SQL queries visually',
      command: 'new.queryDesign',
      testid: 'NewObjectModal_queryDesign',
      disabledMessage: 'Query Designer is not available for current database',
      isProFeature: true,
    },
    {
      icon: 'icon diagram',
      colorClass: 'color-icon-blue',
      title: 'ER Diagram',
      description: 'Visualize database structure',
      command: 'new.diagram',
      testid: 'NewObjectModal_diagram',
      disabledMessage: 'ER Diagram is not available for current database',
    },
    {
      icon: 'icon perspective',
      colorClass: 'color-icon-yellow',
      title: 'Perspective',
      description: 'Join complex data from multiple databases',
      command: 'new.perspective',
      testid: 'NewObjectModal_perspective',
      isProFeature: true,
    },
    {
      icon: 'icon table',
      colorClass: 'color-icon-blue',
      title: 'Table',
      description: 'Create table in the current database',
      command: 'new.table',
      testid: 'NewObjectModal_table',
      disabledMessage: 'Table creation is not available for current database',
    },
    {
      icon: 'icon sql-generator',
      colorClass: 'color-icon-green',
      title: 'SQL Generator',
      description: 'Generate SQL scripts for database objects',
      command: 'sql.generator',
      testid: 'NewObjectModal_sqlGenerator',
      disabledMessage: 'SQL Generator is not available for current database',
    },
    {
      icon: 'icon export',
      colorClass: 'color-icon-green',
      title: 'Export database',
      description: 'Export to file like CSV, JSON, Excel, or other DB',
      command: 'database.export',
      testid: 'NewObjectModal_databaseExport',
      disabledMessage: 'Export is not available for current database',
    },
    {
      icon: 'icon compare',
      colorClass: 'color-icon-red',
      title: 'Compare database',
      description: 'Compare database schemas',
      command: 'database.compare',
      testid: 'NewObjectModal_databaseCompare',
      disabledMessage: 'Database comparison is not available for current database',
      isProFeature: true,
    },
    {
      icon: 'icon ai',
      colorClass: 'color-icon-blue',
      title: 'Database Chat',
      description: 'Chat with your database using AI',
      command: 'database.chat',
      isProFeature: true,
      disabledMessage: 'Database chat is not available for current database',
      testid: 'NewObjectModal_databaseChat',
    }
  ];
</script>

<ModalBase simplefix {...$$restProps}>
  <div class="create-header">Create new</div>
  <div class="wrapper">
    {#each NEW_ITEMS as item}
      {@const enabled = item.command ? $commandsCustomized[item.command]?.enabled : true}
      <NewObjectButton
        icon={item.icon}
        title={item.title}
        description={item.description}
        {enabled}
        colorClass={item.colorClass}
        data-testid={item.testid}
        disabledMessage={item.disabledMessage}
        isProFeature={item.isProFeature}
        on:click={() => {
          if (!enabled) return;
          closeCurrentModal();
          if (item.action) {
            item.action();
          } else if (item.command) {
            runCommand(item.command);
          }
          if (item.changeWidget) {
            $selectedWidget = item.changeWidget;
          }
        }}
      />
    {/each}
  </div>
</ModalBase>

<style>
  .wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    padding: 20px;
  }
  .create-header {
    text-transform: uppercase;
    color: var(--theme-font-3);
    font-size: 150%;
    text-align: center;
  }
</style>
