<script lang="ts">
  import TableControl from '../elements/TableControl.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';
  export let variables: { variable: string; value: any }[] = [];
</script>

<div>
  <TableControl
    rows={variables}
    columns={[
      { header: 'Variable', fieldName: 'variable' },
      {
        header: 'Value',
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
