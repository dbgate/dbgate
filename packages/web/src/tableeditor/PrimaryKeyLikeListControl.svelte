<script lang="ts">
  import { editorDeleteConstraint } from 'dbgate-tools';

  import _ from 'lodash';
  import ConstraintLabel from '../elements/ConstraintLabel.svelte';
  import Link from '../elements/Link.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { showModal } from '../modals/modalTools';

  import PrimaryKeyEditorModal from './PrimaryKeyEditorModal.svelte';

  export let tableInfo;
  export let setTableInfo;
  export let isWritable;
  export let driver;

  export let constraintLabel = 'primary key';
  export let constraintType = 'primaryKey';

  $: columns = tableInfo?.columns;
  $: keyConstraint = tableInfo?.[constraintType];

  function addKeyConstraint() {
    showModal(PrimaryKeyEditorModal, {
      setTableInfo,
      tableInfo,
      constraintLabel,
      constraintType,
      driver,
    });
  }
</script>

<ObjectListControl
  collection={_.compact([keyConstraint])}
  title={_.startCase(constraintLabel)}
  emptyMessage={isWritable ? `No ${constraintLabel} defined` : null}
  onAddNew={isWritable && !keyConstraint && columns?.length > 0 ? addKeyConstraint : null}
  hideDisplayName={driver?.dialect?.anonymousPrimaryKey}
  clickable
  on:clickrow={e =>
    showModal(PrimaryKeyEditorModal, {
      constraintInfo: e.detail,
      tableInfo,
      setTableInfo,
      constraintLabel,
      constraintType,
      driver,
    })}
  columns={[
    {
      fieldName: 'columns',
      header: 'Columns',
      slot: 0,
      sortable: true,
    },
    isWritable
      ? {
          fieldName: 'actions',
          slot: 1,
        }
      : null,
  ]}
>
  <svelte:fragment slot="name" let:row><ConstraintLabel {...row} /></svelte:fragment>
  <svelte:fragment slot="0" let:row>{row?.columns.map(x => x.columnName).join(', ')}</svelte:fragment>
  <svelte:fragment slot="1" let:row
    ><Link
      onClick={e => {
        e.stopPropagation();
        setTableInfo(tbl => editorDeleteConstraint(tbl, row));
      }}>Remove</Link
    ></svelte:fragment
  >
</ObjectListControl>
