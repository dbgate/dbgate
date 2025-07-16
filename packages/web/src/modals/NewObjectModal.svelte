<script lang="ts">
  import NewObjectButton from '../buttons/NewObjectButton.svelte';
  import runCommand from '../commands/runCommand';
  import newQuery from '../query/newQuery';
  import { commandsCustomized, selectedWidget } from '../stores';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let multiTabIndex = undefined;
</script>

<ModalBase simplefix {...$$restProps}>
  <div class="create-header">Create new</div>
  <div class="wrapper">
    <NewObjectButton
      icon="img new-sql-file"
      title="Query"
      description="SQL query editor"
      on:click={() => {
        newQuery({ multiTabIndex });
        closeCurrentModal();
      }}
    />
    {#if $commandsCustomized['new.connection']?.enabled}
      <NewObjectButton
        icon="img new-connection"
        title="Connection"
        description="Database connection stored locally"
        on:click={() => {
          $selectedWidget = 'database';
          runCommand('new.connection');
          closeCurrentModal();
        }}
      />
    {/if}
    {#if $commandsCustomized['new.connectionOnCloud']?.enabled}
      <NewObjectButton
        icon="img cloud-connection"
        title="Connection on Cloud"
        description="Database connection stored on DbGate Cloud"
        on:click={() => {
          $selectedWidget = 'cloud-private';
          runCommand('new.connectionOnCloud');
          closeCurrentModal();
        }}
      />
    {/if}
    {#if $commandsCustomized['new.queryDesign']?.enabled}
      <NewObjectButton
        icon="img query-design"
        title="Query Designer"
        description="Design SQL queries visually"
        on:click={() => {
          runCommand('new.queryDesign');
          closeCurrentModal();
        }}
      />
    {/if}
    {#if $commandsCustomized['new.diagram']?.enabled}
      <NewObjectButton
        icon="img diagram"
        title="ER Diagram"
        description="Visualize database structure"
        on:click={() => {
          runCommand('new.diagram');
          closeCurrentModal();
        }}
      />
    {/if}
    {#if $commandsCustomized['new.perspective']?.enabled}
      <NewObjectButton
        icon="img perspective"
        title="Perspective"
        description="Join complex data from multiple databases"
        on:click={() => {
          runCommand('new.perspective');
          closeCurrentModal();
        }}
      />
    {/if}
    {#if $commandsCustomized['new.table']?.enabled}
      <NewObjectButton
        icon="img table"
        title="Table"
        description="Create table in the current database"
        on:click={() => {
          runCommand('new.table');
          closeCurrentModal();
        }}
      />
    {/if}
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
