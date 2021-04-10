<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import _ from 'lodash';

  import TableControl from '../elements/TableControl.svelte';
  import CommandModal from '../modals/CommandModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { commandsCustomized } from '../stores';

  $: commandList = _.sortBy(_.values($commandsCustomized), ['category', 'name']);
</script>

<div class="wrapper">
  <TableControl
    clickable
    rows={commandList}
    columns={[
      { header: 'Category', fieldName: 'category' },
      { header: 'Name', fieldName: 'name' },
      { header: 'Keyboard shortcut', fieldName: 'keyText', isHighlighted: row => row.customKeyboardShortcut },
      { header: 'commandId', fieldName: 'id' },
    ]}
    on:clickrow={e => showModal(CommandModal, { command: e.detail })}
  />
</div>

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }
</style>
