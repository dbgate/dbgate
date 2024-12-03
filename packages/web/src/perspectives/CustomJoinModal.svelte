<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { fullNameFromString, fullNameToLabel, fullNameToString, getConnectionLabel } from 'dbgate-tools';
  import SelectField from '../forms/SelectField.svelte';
  import _ from 'lodash';
  import {
    useConnectionList,
    useDatabaseInfo,
    useDatabaseList,
    useTableInfo,
    useViewInfo,
  } from '../utility/metadataLoaders';
  import { onMount, tick } from 'svelte';
  import { createPerspectiveNodeConfig, PerspectiveTreeNode } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveCustomJoinConfig } from 'dbgate-datalib';
  import uuidv1 from 'uuid/v1';
  import TextField from '../forms/TextField.svelte';

  export let conid;
  export let database;
  export let root: PerspectiveTreeNode;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let config: PerspectiveConfig;
  export let editValue: PerspectiveCustomJoinConfig = null;

  let conidOverride = editValue?.conid || null;
  let databaseOverride = editValue?.database || null;

  // $: fromDbInfo = useDatabaseInfo({
  //   conid,
  //   database,
  // });
  //   $: fromTableInfo = useTableInfo({
  //     conid: conidOverride || conid,
  //     database: databaseOverride || database,
  //     schemaName: fromSchemaName,
  //     pureName: fromTableName,
  //   });

  $: refDbInfo = useDatabaseInfo({
    conid: conidOverride || conid,
    database: databaseOverride || database,
  });
  $: refTableInfo = useTableInfo({
    conid: conidOverride || conid,
    database: databaseOverride || database,
    schemaName: refSchemaName,
    pureName: refTableName,
  });
  $: refViewInfo = useViewInfo({
    conid: conidOverride || conid,
    database: databaseOverride || database,
    schemaName: refSchemaName,
    pureName: refTableName,
  });

  let columns = editValue?.columns || [];
  //   let fromTableName = pureName;
  //   let fromSchemaName = schemaName;
  let fromDesignerId = editValue?.baseDesignerId || root.designerId;
  let refTableName = editValue?.refTableName || null;
  let refSchemaName = editValue?.refSchemaName || null;
  let joinName = editValue?.joinName || '';

  // onMount(() => {
  //   if (editValue) return;
  //   let index = 1;
  //   while (config.customJoins?.find(x => x.joinName == `Custom join ${index}`)) {
  //     index += 1;
  //   }
  //   joinName = `Custom join ${index}`;
  // });

  //   $: fromTableList = [
  //     ..._.sortBy($fromDbInfo?.tables || [], ['schemaName', 'pureName']),
  //     // ..._.sortBy($dbInfo?.views || [], ['schemaName', 'pureName']),
  //   ];
  $: refTableList = [
    ..._.sortBy($refDbInfo?.tables || [], ['schemaName', 'pureName']),
    ..._.sortBy($refDbInfo?.views || [], ['schemaName', 'pureName']),
  ];

  let refTableOptions = [];
  let fromTableOptions = [];

  $: connections = useConnectionList();
  $: connectionOptions = [
    { value: null, label: 'The same as root' },
    ..._.sortBy(
      ($connections || [])
        // .filter(x => !x.unsaved)
        .map(conn => ({
          value: conn._id,
          label: getConnectionLabel(conn),
        })),
      'label'
    ),
  ];

  // $: fromTable = $fromDbInfo?.tables?.find(x => x.pureName == fromTableName && x.schemaName == fromSchemaName);

  $: databases = useDatabaseList({ conid: conidOverride || conid });

  $: databaseOptions = [
    { value: null, label: 'The same as root' },
    ..._.sortBy(
      ($databases || []).map(db => ({
        value: db.name,
        label: db.name,
      })),
      'label'
    ),
  ];

  $: fromTableList = root.getBaseTables();
  $: fromTableInfo = fromTableList?.find(x => x.node.designerId == fromDesignerId)?.table;

  $: (async () => {
    // without this has svelte problem, doesn't invalidate SelectField options
    await tick();
    // to replicate try to invoke VFK editor after page refresh, when active widget without DB, eg. application layers
    // and comment line above. Tables list in vFK editor will be empty

    fromTableOptions = fromTableList.map(tbl => ({
      label: fullNameToLabel(tbl.table),
      value: tbl.node.designerId,
    }));

    refTableOptions = refTableList.map(tbl => ({
      label: fullNameToLabel(tbl),
      value: fullNameToString(tbl),
    }));
  })();
  // $: refTableInfo = tableList.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);
  // $dbInfo?.views?.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);

  // $: console.log('conid, database', conid, database);
  // $: console.log('$dbInfo?.tables', $dbInfo?.tables);
  // $: console.log('tableList', tableList);
  // $: console.log('tableOptions', tableOptions);
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Define custom join</svelte:fragment>

    <div class="largeFormMarker">
      <div class="row">
        <div class="label col-3">Join name</div>
        <div class="col-9">
          <TextField
            value={joinName}
            options={fromTableOptions}
            on:change={e => {
              joinName = e.target['value'];
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">Base table</div>
        <div class="col-9">
          <SelectField
            value={fromDesignerId}
            isNative
            notSelected
            options={fromTableOptions}
            on:change={e => {
              if (e.detail) {
                fromDesignerId = e.detail;
              }
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">Connection</div>
        <div class="col-9">
          <SelectField
            value={conidOverride}
            isNative
            options={connectionOptions}
            on:change={e => {
              conidOverride = e.detail;
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">Database</div>
        <div class="col-9">
          <SelectField
            value={databaseOverride}
            isNative
            options={databaseOptions}
            on:change={e => {
              databaseOverride = e.detail;
            }}
          />
        </div>
      </div>

      <!-- <FormConnectionSelect name="conid" label="Server" {direction} />
      <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} label="Database" /> -->

      <div class="row">
        <div class="label col-3">Referenced table</div>
        <div class="col-9">
          <SelectField
            value={fullNameToString({ pureName: refTableName, schemaName: refSchemaName })}
            isNative
            notSelected
            options={refTableOptions}
            on:change={e => {
              if (e.detail) {
                const name = fullNameFromString(e.detail);
                refTableName = name.pureName;
                refSchemaName = name.schemaName;
                const refTable = $refDbInfo?.tables?.find(
                  x => x.pureName == refTableName && x.schemaName == refSchemaName
                );
                columns =
                  refTable?.primaryKey?.columns?.map(col => ({
                    refColumnName: col.columnName,
                  })) || [];
              }
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="col-5 mr-1">
          Base column - {fromTableInfo?.pureName}
        </div>
        <div class="col-5 ml-1">
          Ref column - {refTableName || '(table not set)'}
        </div>
      </div>

      {#each columns as column, index}
        <div class="row">
          <div class="col-5 mr-1">
            {#key column.baseColumnName}
              <SelectField
                value={column.baseColumnName}
                isNative
                notSelected
                options={(fromTableInfo?.columns || []).map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, baseColumnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-5 ml-1">
            {#key column.refColumnName}
              <SelectField
                value={column.refColumnName}
                isNative
                notSelected
                options={($refTableInfo?.columns || $refViewInfo?.columns || []).map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, refColumnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-2 button">
            <FormStyledButton
              value="Delete"
              on:click={e => {
                const x = [...columns];
                x.splice(index, 1);
                columns = x;
              }}
            />
          </div>
        </div>
      {/each}

      <FormStyledButton
        type="button"
        value="Add column"
        on:click={() => {
          columns = [
            ...columns,
            {
              baseColumnName: '',
              refColumnName: '',
            },
          ];
        }}
      />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value={'Save'}
        on:click={() => {
          setConfig(cfg => {
            const newNode = createPerspectiveNodeConfig({ pureName: refTableName, schemaName: refSchemaName });
            newNode.designerId = editValue?.refNodeDesignerId || uuidv1();
            newNode.conid = conidOverride;
            newNode.database = databaseOverride;
            newNode.position = cfg.nodes.find(x => x.designerId == editValue?.refNodeDesignerId)?.position;
            newNode.alias = joinName;

            const newRef = {
              designerId: editValue?.referenceDesignerId || uuidv1(),
              sourceId: fromDesignerId,
              targetId: newNode.designerId,
              columns: columns.map(col => ({
                source: col.baseColumnName,
                target: col.refColumnName,
              })),
            };

            return {
              ...cfg,
              nodes: [...cfg.nodes.filter(x => x.designerId != editValue?.refNodeDesignerId), newNode],
              references: [...cfg.references.filter(x => x.designerId != editValue?.referenceDesignerId), newRef],
            };
          });

          // const newJoin = {
          //   joinid,
          //   joinName,
          //   baseDesignerId: fromDesignerId,
          //   refTableName,
          //   refSchemaName,
          //   columns,
          //   conid: conidOverride,
          //   database: databaseOverride,
          // };
          // setConfig(cfg => ({
          //   ...cfg,
          //   customJoins: editValue
          //     ? cfg.customJoins.map(x => (x.joinid == editValue.joinid ? newJoin : x))
          //     : [...(cfg.customJoins || []), newJoin],
          // }));
          closeCurrentModal();
        }}
      />

      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .row .label {
    white-space: nowrap;
    align-self: center;
  }

  .button {
    align-self: center;
    text-align: right;
  }
</style>
