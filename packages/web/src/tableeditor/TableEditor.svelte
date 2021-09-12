<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('TableEditor');

  registerCommand({
    id: 'tableEditor.addColumn',
    category: 'Table editor',
    name: 'Add column',
    icon: 'icon add-column',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.writable(),
    onClick: () => getCurrentEditor().addColumn(),
  });

  registerCommand({
    id: 'tableEditor.addPrimaryKey',
    category: 'Table editor',
    name: 'Add primary key',
    icon: 'icon add-key',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.allowAddPrimaryKey(),
    onClick: () => getCurrentEditor().addPrimaryKey(),
  });

  registerCommand({
    id: 'tableEditor.addForeignKey',
    category: 'Table editor',
    name: 'Add foreign key',
    icon: 'icon add-key',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.writable(),
    onClick: () => getCurrentEditor().addForeignKey(),
  });

  registerCommand({
    id: 'tableEditor.addIndex',
    category: 'Table editor',
    name: 'Add index',
    icon: 'icon add-key',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.writable(),
    onClick: () => getCurrentEditor().addIndex(),
  });

  registerCommand({
    id: 'tableEditor.addUnique',
    category: 'Table editor',
    name: 'Add unique',
    icon: 'icon add-key',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.writable(),
    onClick: () => getCurrentEditor().addUnique(),
  });
</script>

<script lang="ts">
  import { editorDeleteColumn, editorDeleteConstraint } from 'dbgate-tools';

  import _ from 'lodash';
  import { onMount, tick } from 'svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import ConstraintLabel from '../elements/ConstraintLabel.svelte';
  import ForeignKeyObjectListControl from '../elements/ForeignKeyObjectListControl.svelte';
  import Link from '../elements/Link.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { showModal } from '../modals/modalTools';
  import useEditorData from '../query/useEditorData';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  import { useDbCore } from '../utility/metadataLoaders';
  import ColumnEditorModal from './ColumnEditorModal.svelte';
  import ForeignKeyEditorModal from './ForeignKeyEditorModal.svelte';
  import IndexEditorModal from './IndexEditorModal.svelte';
  import PrimaryKeyEditorModal from './PrimaryKeyEditorModal.svelte';
  import UniqueEditorModal from './UniqueEditorModal.svelte';

  export const activator = createActivator('TableEditor', true);

  export let tableInfo;
  export let setTableInfo;
  export let dbInfo;

  export function writable() {
    return !!setTableInfo;
  }

  export function addColumn() {
    showModal(ColumnEditorModal, {
      setTableInfo,
      tableInfo,
      onAddNext: async () => {
        await tick();
        addColumn();
      },
    });
  }

  export function allowAddPrimaryKey() {
    return writable() && !tableInfo?.primaryKey;
  }

  export function addPrimaryKey() {
    showModal(PrimaryKeyEditorModal, {
      setTableInfo,
      tableInfo,
    });
  }

  export function addForeignKey() {
    showModal(ForeignKeyEditorModal, {
      setTableInfo,
      tableInfo,
      dbInfo,
    });
  }

  export function addIndex() {
    showModal(IndexEditorModal, {
      setTableInfo,
      tableInfo,
      dbInfo,
    });
  }

  export function addUnique() {
    showModal(UniqueEditorModal, {
      setTableInfo,
      tableInfo,
      dbInfo,
    });
  }

  $: columns = tableInfo?.columns;
  $: primaryKey = tableInfo?.primaryKey;
  $: foreignKeys = tableInfo?.foreignKeys;
  $: dependencies = tableInfo?.dependencies;
  $: indexes = tableInfo?.indexes;
  $: uniques = tableInfo?.uniques;

  $: {
    tableInfo;
    invalidateCommands();
  }
</script>

<div class="wrapper">
  <ObjectListControl
    collection={columns?.map((x, index) => ({ ...x, ordinal: index + 1 }))}
    title={`Columns (${columns?.length || 0})`}
    showIfEmpty
    clickable={writable()}
    on:clickrow={e => showModal(ColumnEditorModal, { columnInfo: e.detail, tableInfo, setTableInfo })}
    onAddNew={addColumn}
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
      writable()
        ? {
            fieldName: 'actions',
            sortable: true,
            slot: 3,
          }
        : null,
    ]}
  >
    <svelte:fragment slot="0" let:row>{row?.notNull ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="1" let:row>{row?.isSparse ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="2" let:row>{row?.isPersisted ? 'YES' : 'NO'}</svelte:fragment>
    <svelte:fragment slot="3" let:row
      ><Link onClick={() => setTableInfo(tbl => editorDeleteColumn(tbl, row))}>Remove</Link></svelte:fragment
    >
    <svelte:fragment slot="name" let:row><ColumnLabel {...row} forceIcon /></svelte:fragment>
  </ObjectListControl>

  <ObjectListControl
    collection={_.compact([primaryKey])}
    title="Primary key"
    onAddNew={primaryKey ? null : addPrimaryKey}
    clickable={writable()}
    on:clickrow={e => showModal(PrimaryKeyEditorModal, { constraintInfo: e.detail, tableInfo, setTableInfo })}
    columns={[
      {
        fieldName: 'columns',
        header: 'Columns',
        slot: 0,
      },
      writable()
        ? {
            fieldName: 'actions',
            sortable: true,
            slot: 1,
          }
        : null,
    ]}
  >
    <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
    <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
    <svelte:fragment slot="1" let:row
      ><Link onClick={() => setTableInfo(tbl => editorDeleteConstraint(tbl, row))}>Remove</Link></svelte:fragment
    >
  </ObjectListControl>

  <ObjectListControl
    collection={indexes}
    onAddNew={addIndex}
    title={`Indexes (${indexes?.length || 0})`}
    clickable={writable()}
    on:clickrow={e => showModal(UniqueEditorModal, { constraintInfo: e.detail, tableInfo, setTableInfo })}
    columns={[
      {
        fieldName: 'columns',
        header: 'Columns',
        slot: 0,
      },
      writable()
        ? {
            fieldName: 'actions',
            sortable: true,
            slot: 1,
          }
        : null,
    ]}
  >
    <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
    <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
    <svelte:fragment slot="1" let:row
      ><Link onClick={() => setTableInfo(tbl => editorDeleteConstraint(tbl, row))}>Remove</Link></svelte:fragment
    >
  </ObjectListControl>

  <ObjectListControl
    collection={uniques}
    onAddNew={addUnique}
    title={`Unique constraints (${uniques?.length || 0})`}
    clickable={writable()}
    on:clickrow={e => showModal(IndexEditorModal, { constraintInfo: e.detail, tableInfo, setTableInfo })}
    columns={[
      {
        fieldName: 'columns',
        header: 'Columns',
        slot: 0,
      },
      writable()
        ? {
            fieldName: 'actions',
            sortable: true,
            slot: 1,
          }
        : null,
    ]}
  >
    <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
    <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
    <svelte:fragment slot="1" let:row
      ><Link onClick={() => setTableInfo(tbl => editorDeleteConstraint(tbl, row))}>Remove</Link></svelte:fragment
    >
  </ObjectListControl>

  <ForeignKeyObjectListControl
    collection={foreignKeys}
    onAddNew={addForeignKey}
    title={`Foreign keys (${foreignKeys?.length || 0})`}
    clickable={writable()}
    onRemove={row => setTableInfo(tbl => editorDeleteConstraint(tbl, row))}
    on:clickrow={e => showModal(ForeignKeyEditorModal, { constraintInfo: e.detail, tableInfo, setTableInfo, dbInfo })}
  />
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
