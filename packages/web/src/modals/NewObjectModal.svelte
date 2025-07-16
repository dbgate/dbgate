<script lang="ts">
  import NewObjectButton from '../buttons/NewObjectButton.svelte';
  import runCommand from '../commands/runCommand';
  import newQuery from '../query/newQuery';
  import { commandsCustomized, selectedWidget } from '../stores';
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
    },
    {
      icon: 'icon cloud-connection',
      colorClass: 'color-icon-blue',
      title: 'Connection on Cloud',
      description: 'Database connection stored on DbGate Cloud',
      command: 'new.connectionOnCloud',
      changeWidget: 'cloud-private',
      testid: 'NewObjectModal_connectionOnCloud',
    },
    {
      icon: 'icon query-design',
      colorClass: 'color-icon-red',
      title: 'Query Designer',
      description: 'Design SQL queries visually',
      command: 'new.queryDesign',
      testid: 'NewObjectModal_queryDesign',
    },
    {
      icon: 'icon diagram',
      colorClass: 'color-icon-blue',
      title: 'ER Diagram',
      description: 'Visualize database structure',
      command: 'new.diagram',
      testid: 'NewObjectModal_diagram',
    },
    {
      icon: 'icon perspective',
      colorClass: 'color-icon-yellow',
      title: 'Perspective',
      description: 'Join complex data from multiple databases',
      command: 'new.perspective',
      testid: 'NewObjectModal_perspective',
    },
    {
      icon: 'icon table',
      colorClass: 'color-icon-blue',
      title: 'Table',
      description: 'Create table in the current database',
      command: 'new.table',
      testid: 'NewObjectModal_table',
    },
    {
      icon: 'icon sql-generator',
      colorClass: 'color-icon-green',
      title: 'SQL Generator',
      description: 'Generate SQL scripts for database objects',
      command: 'sql.generator',
      testid: 'NewObjectModal_sqlGenerator',
    },
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
