<script>
  import _ from 'lodash';

  import ConstraintLabel from '../elements/ConstraintLabel.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import Link from './Link.svelte';

  export let collection;
  export let title;
  export let clickable;
  export let onRemove = null;
  export let onAddNew = null;
  export let emptyMessage = null;
</script>

<ObjectListControl
  {collection}
  {title}
  {onAddNew}
  {clickable}
  {emptyMessage}
  on:clickrow
  columns={[
    {
      fieldName: 'baseColumns',
      header: 'Base columns',
      slot: 0,
    },
    {
      fieldName: 'refTableName',
      header: 'Referenced table',
    },
    {
      fieldName: 'refColumns',
      header: 'Referenced columns',
      slot: 1,
    },
    {
      fieldName: 'updateAction',
      header: 'ON UPDATE',
    },
    {
      fieldName: 'deleteAction',
      header: 'ON DELETE',
    },
    onRemove
      ? {
          fieldName: 'actions',
          sortable: true,
          slot: 2,
        }
      : null,
  ]}
>
  <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
  <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
  <svelte:fragment slot="1" let:row>{row?.columns.map(x => x.refColumnName).join(', ')}</svelte:fragment>
  <svelte:fragment slot="2" let:row><Link onClick={() => onRemove(row)}>Remove</Link></svelte:fragment>
</ObjectListControl>
