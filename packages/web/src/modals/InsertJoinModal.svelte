<script lang="ts">
  import { SqlDumper } from 'dbgate-tools';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import TextField from '../forms/TextField.svelte';
  import analyseQuerySources from '../query/analyseQuerySources';
  import SqlEditor from '../query/SqlEditor.svelte';
  import keycodes from '../utility/keycodes';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let sql;
  export let onInsert;
  export let dbinfo;
  export let engine;

  let sourceIndex = 0;
  let targetIndex = 0;
  let joinIndex = 0;
  let alias = '';

  let domSource = null;
  let domTarget = null;
  let domAlias = null;
  let domJoin = null;

  const JOIN_TYPES = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'];

  $: sources = analyseQuerySources(sql, [...dbinfo.tables.map(x => x.pureName), ...dbinfo.views.map(x => x.pureName)]);

  $: targets = computeTargets(sources, sourceIndex);

  function computeTargets(sources, sourceIndex) {
    const source = sources[sourceIndex];
    if (!source) return [];
    /** @type {import('dbgate-types').TableInfo} */
    const table = dbinfo.tables.find(x => x.pureName == sources[sourceIndex].name);
    if (!table) return [];
    return [
      ...table.foreignKeys.map(fk => ({
        baseColumns: fk.columns.map(x => x.columnName).join(', '),
        refTable: fk.refTableName,
        refColumns: fk.columns.map(x => x.refColumnName).join(', '),
        constraintName: fk.constraintName,
        columnMap: fk.columns,
      })),
      ...table.dependencies.map(fk => ({
        baseColumns: fk.columns.map(x => x.refColumnName).join(', '),
        refTable: fk.pureName,
        refColumns: fk.columns.map(x => x.columnName).join(', '),
        constraintName: fk.constraintName,
        columnMap: fk.columns.map(x => ({
          columnName: x.refColumnName,
          refColumnName: x.columnName,
        })),
      })),
    ];
  }

  $: sqlPreview = computePreview(joinIndex, sources, targets, sourceIndex, targetIndex, alias);

  function computePreview(joinIndex, sources, targets, sourceIndex, targetIndex, alias) {
    const source = sources[sourceIndex];
    const target = targets[targetIndex];
    if (source && target) {
      return `${SqlDumper.convertKeywordCase(JOIN_TYPES[joinIndex])} ${target.refTable}${
        alias ? ` ${alias}` : ''
      } ${SqlDumper.convertKeywordCase('ON')} ${target.columnMap
        .map(col => `${source.name}.${col.columnName} = ${alias || target.refTable}.${col.refColumnName}`)
        .join(SqlDumper.convertKeywordCase(' AND '))}`;
    }
    return '';
  }

  const sourceKeyDown = event => {
    if (event.keyCode == keycodes.enter || event.keyCode == keycodes.rightArrow) {
      domTarget.focus();
    }
  };
  const targetKeyDown = event => {
    if (event.keyCode == keycodes.leftArrow) {
      domSource.focus();
    }
    if (event.keyCode == keycodes.enter || event.keyCode == keycodes.rightArrow) {
      domJoin.focus();
    }
  };
  const joinKeyDown = event => {
    if (event.keyCode == keycodes.leftArrow) {
      domTarget.focus();
    }
    if (event.keyCode == keycodes.enter) {
      domAlias.focus();
    }
  };
  const aliasKeyDown = event => {
    if (event.keyCode == keycodes.enter) {
      event.preventDefault();
      closeCurrentModal();
      onInsert(sqlPreview);
    }
  };
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">Insert join</svelte:fragment>

  <div class="flex mb-3">
    <div class="m-1 col-3">
      <div class="m-1">Existing table</div>

      <TableControl
        rows={sources}
        focusOnCreate
        bind:selectedIndex={sourceIndex}
        bind:domTable={domSource}
        selectable
        on:keydown={sourceKeyDown}
        columns={[
          { fieldName: 'alias', header: 'Alias' },
          { fieldName: 'name', header: 'Name' },
        ]}
      />
    </div>

    <div class="m-1 col-6">
      <div class="m-1">New table</div>

      <TableControl
        rows={targets}
        bind:selectedIndex={targetIndex}
        bind:domTable={domTarget}
        selectable
        on:keydown={targetKeyDown}
        columns={[
          { fieldName: 'baseColumns', header: 'Column from' },
          { fieldName: 'refTable', header: 'Table to' },
          { fieldName: 'refColumns', header: 'Column to' },
        ]}
      />
    </div>

    <div class="m-1 col-3">
      <div class="m-1">Join</div>

      <TableControl
        rows={JOIN_TYPES.map(name => ({ name }))}
        bind:selectedIndex={joinIndex}
        bind:domTable={domJoin}
        selectable
        on:keydown={joinKeyDown}
        columns={[{ fieldName: 'name', header: 'Join type' }]}
      />

      <div class="m-1">Alias</div>
      <TextField
        value={alias}
        on:input={e => {
          // @ts-ignore
          alias = e.target.value;
        }}
        bind:domEditor={domAlias}
        on:keydown={aliasKeyDown}
      />
    </div>
  </div>
  <div class="sql">
    <SqlEditor readOnly value={sqlPreview} {engine} />
  </div>

  <svelte:fragment slot="footer">
    <FormStyledButton
      value="OK"
      on:click={() => {
        closeCurrentModal();
        onInsert(sqlPreview);
      }}
    />
    <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
  </svelte:fragment>
</ModalBase>

<style>
  .sql {
    position: relative;
    height: 80px;
    width: 40vw;
  }
</style>
