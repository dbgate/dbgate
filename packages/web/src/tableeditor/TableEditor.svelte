<script lang="ts">
  import { ColumnInfo, ForeignKeyInfo, PrimaryKeyInfo } from 'dbgate-types';

  import _ from 'lodash';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import ConstraintLabel from '../elements/ConstraintLabel.svelte';
  import ForeignKeyObjectListControl from '../elements/ForeignKeyObjectListControl.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import useEditorData from '../query/useEditorData';

  import { useDbCore } from '../utility/metadataLoaders';

  export let tableInfo;

  $: columns = $tableInfo?.columns as ColumnInfo[];
  $: primaryKey = $tableInfo?.primaryKey as PrimaryKeyInfo;
  $: foreignKeys = $tableInfo?.foreignKeys as ForeignKeyInfo[];
  $: dependencies = $tableInfo?.dependencies as ForeignKeyInfo[];

</script>

<div class="wrapper">
  <ObjectListControl
    collection={columns?.map((x, index) => ({ ...x, ordinal: index + 1 }))}
    title="Columns"
    columns={[
      {
        fieldName: 'notNull',
        header: 'Not NULL',
        sortable: true,
        slot: 0,
      },
      {
        fieldName: 'dataType',
        header: 'Data Type',
        sortable: true,
      },
      {
        fieldName: 'defaultValue',
        header: 'Default value',
        sortable: true,
      },
      {
        fieldName: 'isSparse',
        header: 'Is Sparse',
        sortable: true,
        slot: 1,
      },
      {
        fieldName: 'computedExpression',
        header: 'Computed Expression',
        sortable: true,
      },
      {
        fieldName: 'isPersisted',
        header: 'Is Persisted',
        sortable: true,
        slot: 2,
      },
    ]}
  >
    <svelte:fragment slot="0" let:row>{row?.notNull ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="1" let:row>{row?.isSparse ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="2" let:row>{row?.isPersisted ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="name" let:row><ColumnLabel {...row} forceIcon /></svelte:fragment>
  </ObjectListControl>

  <ObjectListControl
    collection={_.compact([primaryKey])}
    title="Primary key"
    columns={[
      {
        fieldName: 'columns',
        header: 'Columns',
        slot: 0,
      },
    ]}
  >
    <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
    <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
  </ObjectListControl>

  <ForeignKeyObjectListControl collection={foreignKeys} title="Foreign keys" />
  <ForeignKeyObjectListControl collection={dependencies} title="Dependencies" />
</div>

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

</style>
