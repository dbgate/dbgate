<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import { filterName } from 'dbgate-tools';

  import _ from 'lodash';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';

  import TableControl from '../elements/TableControl.svelte';
  import CommandModal from '../modals/CommandModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { commandsCustomized } from '../stores';

  $: commandList = _.sortBy(_.values($commandsCustomized), ['category', 'name']);
  let filter;
</script>

<div class="wrapper">
  <div class="flex">
    <SearchInput placeholder="Search in commands (by category, name, shortcut or id)" bind:value={filter} />
    <CloseSearchButton bind:filter showDisabled />
  </div>

  <div class="table-wrapper">
    <TableControl
      clickable
      rows={commandList.filter(cmd => filterName(filter, cmd['category'], cmd['name'], cmd['keyText'], cmd['id']))}
      columns={[
        { header: 'Category', fieldName: 'category' },
        { header: 'Name', fieldName: 'name' },
        { header: 'Keyboard shortcut', fieldName: 'keyText', isHighlighted: row => row.customKeyboardShortcut },
        { header: 'commandId', fieldName: 'id' },
      ]}
      on:clickrow={e => showModal(CommandModal, { command: e.detail })}
    />
  </div>
</div>

<style>
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .table-wrapper {
    overflow: auto;
    display: flex;
  }
</style>
