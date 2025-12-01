<script lang="ts">
  import NewObjectButton from '../buttons/NewObjectButton.svelte';
  import runCommand from '../commands/runCommand';
  import newQuery from '../query/newQuery';
  import { commandsCustomized, selectedWidget } from '../stores';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let multiTabIndex = undefined;

  let NEW_ITEMS = [
    {
      icon: 'icon sql-file',
      colorClass: 'color-icon-blue',
      title: _t('common.query', { defaultMessage: 'Query' }),
      description: _t('common.queryEditor', { defaultMessage: 'SQL query editor' }),
      action: () => {
        newQuery({ multiTabIndex });
      },
      testid: 'NewObjectModal_query',
      testEnabled: () => hasPermission('dbops/query'),
    },
    {
      icon: 'icon connection',
      colorClass: 'color-icon-yellow',
      title: _t('common.connection', { defaultMessage: 'Connection' }),
      description: _t('newObject.connectionLocal', { defaultMessage: 'Database connection stored locally' }),
      command: 'new.connection',
      changeWidget: 'database',
      testid: 'NewObjectModal_connection',
      disabledMessage: _t('newObject.connectionLocalDisabled', { defaultMessage: 'You are not allowed to create new connections' }),
    },
    {
      icon: 'icon cloud-connection',
      colorClass: 'color-icon-blue',
      title: _t('common.connectionOnCloud', { defaultMessage: 'Connection on Cloud' }),
      description: _t('newObject.connectionOnCloudDescription', { defaultMessage: 'Database connection stored on DbGate Cloud' }),
      command: 'new.connectionOnCloud',
      changeWidget: 'cloud-private',
      testid: 'NewObjectModal_connectionOnCloud',
      disabledMessage: _t('newObject.connectionOnCloudDisabled', { defaultMessage: 'For creating connections on DbGate Cloud, you need to be logged in' }),
    },
    {
      icon: 'icon query-design',
      colorClass: 'color-icon-red',
      title: _t('common.queryDesigner', { defaultMessage: 'Query Designer' }),
      description: _t('newObject.queryDesignerDescription', { defaultMessage: 'Design SQL queries visually' }),
      command: 'new.queryDesign',
      testid: 'NewObjectModal_queryDesign',
      disabledMessage: _t('newObject.queryDesignerDisabled', { defaultMessage: 'Query Designer is not available for current database' }),
      isProFeature: true,
    },
    {
      icon: 'icon diagram',
      colorClass: 'color-icon-blue',
      title: _t('common.erDiagram', { defaultMessage: 'ER Diagram' }),
      description: _t('newObject.erDiagramDescription', { defaultMessage: 'Visualize database structure' }),
      command: 'new.diagram',
      testid: 'NewObjectModal_diagram',
      disabledMessage: _t('newObject.erDiagramDisabled', { defaultMessage: 'ER Diagram is not available for current database' }),
    },
    {
      icon: 'icon perspective',
      colorClass: 'color-icon-yellow',
      title: _t('common.perspective', { defaultMessage: 'Perspective' }),
      description: _t('newObject.perspectiveDescription', { defaultMessage: 'Join complex data from multiple databases' }),
      command: 'new.perspective',
      testid: 'NewObjectModal_perspective',
      isProFeature: true,
    },
    {
      icon: 'icon table',
      colorClass: 'color-icon-blue',
      title: _t('common.table', { defaultMessage: 'Table' }),
      description: _t('newObject.tableDescription', { defaultMessage: 'Create table in the current database' }),
      command: 'new.table',
      testid: 'NewObjectModal_table',
      disabledMessage: _t('newObject.tableDisabled', { defaultMessage: 'Table creation is not available for current database' }),
    },
    {
      icon: 'icon sql-generator',
      colorClass: 'color-icon-green',
      title: _t('common.sqlGenerator', { defaultMessage: 'SQL Generator' }),
      description: _t('newObject.sqlGeneratorDescription', { defaultMessage: 'Generate SQL scripts for database objects' }),
      command: 'sql.generator',
      testid: 'NewObjectModal_sqlGenerator',
      disabledMessage: _t('newObject.sqlGeneratorDisabled', { defaultMessage: 'SQL Generator is not available for current database' }),
    },
    {
      icon: 'icon export',
      colorClass: 'color-icon-green',
      title: _t('common.exportDatabase', { defaultMessage: 'Export database' }),
      description: _t('newObject.exportDescription', { defaultMessage: 'Export to file like CSV, JSON, Excel, or other DB' }),
      command: 'database.export',
      isProFeature: true,
      testid: 'NewObjectModal_databaseExport',
      disabledMessage: _t('newObject.exportDisabled', { defaultMessage: 'Export is not available for current database' }),
    },
    {
      icon: 'icon compare',
      colorClass: 'color-icon-red',
      title: _t('common.compareDatabase', { defaultMessage: 'Compare database' }),
      description: _t('newObject.compareDescription', { defaultMessage: 'Compare database schemas' }),
      command: 'database.compare',
      testid: 'NewObjectModal_databaseCompare',
      disabledMessage: _t('newObject.compareDisabled', { defaultMessage: 'Database comparison is not available for current database' }),
      isProFeature: true,
    },
    {
      icon: 'icon ai',
      colorClass: 'color-icon-blue',
      title: _t('common.databaseChat', { defaultMessage: 'Database Chat' }),
      description: _t('newObject.databaseChatDescription', { defaultMessage: 'Chat with your database using AI' }),
      command: 'database.chat',
      isProFeature: true,
      disabledMessage: _t('newObject.databaseChatDisabled', { defaultMessage: 'Database chat is not available for current database' }),
      testid: 'NewObjectModal_databaseChat',
    },
  ];
</script>

<ModalBase simplefix {...$$restProps}>
  <div class="create-header">{_t('common.createNew', { defaultMessage: 'Create new' })}</div>
  <div class="wrapper">
    {#each NEW_ITEMS as item}
      {@const enabled = item.command
        ? $commandsCustomized[item.command]?.enabled
        : item.testEnabled
          ? item.testEnabled()
          : true}
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
