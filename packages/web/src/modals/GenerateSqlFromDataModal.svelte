<script lang="ts">
  import CheckableColumnList from '../elements/CheckableColumnList.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import TextField from '../forms/TextField.svelte';
  import analyseQuerySources from '../query/analyseQuerySources';
  import newQuery from '../query/newQuery';
  import SqlEditor from '../query/SqlEditor.svelte';
  import keycodes from '../utility/keycodes';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let rows;
  export let allColumns = [];
  export let selectedColumns = [];
  export let keyColumns = [];
  export let tableInfo;
  export let engineDriver;

  let queryTypeIndex = 0;
  let domQueryType = null;

  let valueColumns = selectedColumns.filter(x => allColumns.includes(x));
  let whereColumns = keyColumns.filter(x => allColumns.includes(x));

  const QUERY_TYPES = ['INSERT', 'UPDATE', 'DELETE'];
  const VALUE_QUERIES = ['INSERT', 'UPDATE'];
  const WHERE_QUERIES = ['UPDATE', 'DELETE'];

  $: sqlPreview = computePreview(rows, valueColumns, whereColumns, queryTypeIndex);

  function computePreview(rows, valueColumns, whereColumns, queryTypeIndex) {
    const queryType = QUERY_TYPES[queryTypeIndex];

    const dmp = engineDriver.createDumper();

    function putCondition(row) {
      dmp.putCollection(' ^and ', whereColumns, col =>
        row[col] == null ? dmp.put('%i ^is ^null', col) : dmp.put('%i=%v', col, row[col])
      );
    }

    switch (queryType) {
      case 'INSERT':
        for (const row of rows) {
          dmp.putCmd(
            '^insert ^into %f (%,i) ^values (%,v)',
            tableInfo,
            valueColumns,
            valueColumns.map(col => row[col])
          );
        }
        break;
      case 'UPDATE':
        for (const row of rows) {
          dmp.put('^update %f ^set', tableInfo);
          dmp.putCollection(', ', valueColumns, col => dmp.put('%i=%v', col, row[col]));
          dmp.put(' ^where ');
          putCondition(row);
          dmp.endCommand();
        }
        break;
      case 'DELETE':
        for (const row of rows) {
          dmp.put('^delete ^from %f ^where ', tableInfo);
          putCondition(row);
          dmp.endCommand();
        }
        break;
    }
    return dmp.s;
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Generate SQL from data</svelte:fragment>

    <div class="flex mb-3">
      <div class="m-1 col-4">
        <div class="m-1">Choose query type</div>

        <TableControl
          rows={QUERY_TYPES.map(name => ({ name }))}
          bind:selectedIndex={queryTypeIndex}
          bind:domTable={domQueryType}
          focusOnCreate
          selectable
          columns={[{ fieldName: 'name', header: 'Query type' }]}
        />
      </div>

      <div class="m-1 col-4">
        <div class="m-1">Value columns</div>

        <CheckableColumnList
          {allColumns}
          bind:selectedColumns={valueColumns}
          disabled={!VALUE_QUERIES.includes(QUERY_TYPES[queryTypeIndex])}
        />
      </div>

      <div class="m-1 col-4">
        <div class="m-1">WHERE columns</div>

        <CheckableColumnList
          {allColumns}
          bind:selectedColumns={whereColumns}
          disabled={!WHERE_QUERIES.includes(QUERY_TYPES[queryTypeIndex])}
        />
      </div>
    </div>

    <div class="sql">
      <SqlEditor readOnly value={sqlPreview} engine={engineDriver?.engine} />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={() => {
          newQuery({ initialData: sqlPreview });
          closeCurrentModal();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .sql {
    position: relative;
    height: 25vh;
    width: 40vw;
  }
</style>
