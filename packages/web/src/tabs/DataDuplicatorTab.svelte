<script lang="ts">
  import _ from 'lodash';
  import invalidateCommands from '../commands/invalidateCommands';
  import TableControl from '../elements/TableControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import useEditorData from '../query/useEditorData';
  import { currentArchive } from '../stores';
  import { useArchiveFiles, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import TableStructureTab from './TableStructureTab.svelte';

  export let conid;
  export let database;
  export let tabid;

  $: connection = useConnectionInfo({ conid });
  $: dbinfo = useDatabaseInfo({ conid, database });

  $: archiveFiles = useArchiveFiles({ folder: $currentArchive });

  $: pairedNames = _.intersectionBy(
    $dbinfo?.tables?.map(x => x.pureName),
    $archiveFiles?.map(x => x.name),
    (x: string) => _.toUpper(x)
  );

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      invalidateCommands();
    },
  });

  function changeTable(row) {
    setEditorData(old => ({
      ...old,
      tables: {
        ...old?.tables,
        [row.name]: row,
      },
    }));
  }

  // $: console.log('$archiveFiles', $archiveFiles);
  // $: console.log('$editorState', $editorState);

  $: tableRows = pairedNames.map(name => {
    const item = $editorState?.value?.tables?.[name];
    const isChecked = item?.isChecked ?? true;
    const operation = item?.operation ?? 'copy';
    const tableInfo = $dbinfo?.tables?.find(x => x.pureName?.toUpperCase() == name.toUpperCase());
    const matchColumn1 =
      item?.matchColumn1 ?? tableInfo?.primaryKey?.columns?.[0]?.columnName ?? tableInfo?.columns?.[0]?.columnName;

    return {
      name,
      isChecked,
      operation,
      matchColumn1,
    };
  });
</script>

<div>
  <div class="bold m-2">Imported files</div>

  <TableControl
    rows={tableRows}
    columns={[
      { header: '', fieldName: 'isChecked', slot: 1 },
      { header: 'File=>Table', fieldName: 'name' },
      { header: 'Operation', fieldName: 'operation', slot: 2 },
      { header: 'Match column', fieldName: 'matchColumn1', slot: 3 },
    ]}
  >
    <svelte:fragment slot="1" let:row>
      <CheckboxField
        checked={row.isChecked}
        on:change={e => {
          changeTable({ ...row, isChecked: e.target.checked });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="2" let:row>
      <SelectField
        isNative
        value={row.operation}
        on:change={e => {
          changeTable({ ...row, operation: e.detail });
        }}
        disabled={!row.isChecked}
        options={[
          { label: 'Copy row', value: 'copy' },
          { label: 'Lookup (find matching row)', value: 'lookup' },
          { label: 'Insert if not exists', value: 'insertMissing' },
        ]}
      />
    </svelte:fragment>
    <svelte:fragment slot="3" let:row>
      {#if row.operation != 'copy'}
        <SelectField
          isNative
          value={row.matchColumn1}
          on:change={e => {
            changeTable({ ...row, matchColumn1: e.detail });
          }}
          disabled={!row.isChecked}
          options={$dbinfo?.tables
            ?.find(x => x.pureName?.toUpperCase() == row.name.toUpperCase())
            ?.columns?.map(col => ({
              label: col.columnName,
              value: col.columnName,
            })) || []}
        />
      {/if}
    </svelte:fragment>
  </TableControl>
</div>
<!-- <div>
  {#each pairedNames as name}
    <div>{name}</div>
  {/each}
</div> -->

<!-- <style>
    .title {
        font-weight: bold;
    }
</style> -->
