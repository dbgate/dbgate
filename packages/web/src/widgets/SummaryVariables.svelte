<script lang="ts">
  import { writable } from 'svelte/store';
  import TableControl from '../elements/TableControl.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';
  import { _t } from '../translations';
  export let variables: { variable: string; value: any }[] = [];

  const filters = writable({});
</script>

<div>
  <TableControl
    stickyHeader
    rows={variables}
    {filters}
    columns={[
      {
        sortable: true,
        filterable: true,
        header: _t('summaryVariables.variable', { defaultMessage: 'Variable' }),
        fieldName: 'variable',
      },
      {
        sortable: true,
        filterable: true,
        header: _t('summaryVariables.value', { defaultMessage: 'Value' }),
        fieldName: 'value',
        slot: 0,
      },
    ]}
  >
    <svelte:fragment slot="0" let:row>
      <JSONTree labelOverride="" hideKey key={row.variable} value={row.value} expandAll={false} />
    </svelte:fragment>
  </TableControl>
</div>

<style>
  div {
    padding: 10px;
  }
</style>
