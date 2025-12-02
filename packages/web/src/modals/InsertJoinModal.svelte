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
  import { _t } from '../translations';
  import _ from 'lodash';

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
  <svelte:fragment slot="header">{_t('insertJoin.insertJoin', { defaultMessage: 'Insert join' })}</svelte:fragment>

  <div class="flex mb-3">
    <div class="m-1 col-3">
      <div class="m-1">{_t('insertJoin.existingTable', { defaultMessage: 'Existing table' })}</div>
      <TableControl
        rows={sources}
        focusOnCreate
        bind:selectedIndex={sourceIndex}
        bind:domTable={domSource}
        selectable
        on:keydown={sourceKeyDown}
        columns={[
          { fieldName: 'alias', header: _t('insertJoin.alias', { defaultMessage: 'Alias' }) },
          { fieldName: 'name', header: _t('insertJoin.name', { defaultMessage: 'Name' }) },
        ]}
      />
    </div>

    <div class="m-1 col-6">
      <div class="m-1">{_t('insertJoin.newTable', { defaultMessage: 'New table' })}</div>

      <TableControl
        rows={targets}
        bind:selectedIndex={targetIndex}
        bind:domTable={domTarget}
        selectable
        on:keydown={targetKeyDown}
        columns={[
          { fieldName: 'baseColumns', header: _t('insertJoin.columnFrom', { defaultMessage: 'Column from' }) },
          { fieldName: 'refTable', header: _t('insertJoin.tableTo', { defaultMessage: 'Table to' }) },
          { fieldName: 'refColumns', header: _t('insertJoin.columnTo', { defaultMessage: 'Column to' }) },
        ]}
      />
    </div>

    <div class="m-1 col-3">
      <div class="m-1">{_t('insertJoin.join', { defaultMessage: 'Join' })}</div>

      <TableControl
        rows={JOIN_TYPES.map(name => ({ name }))}
        bind:selectedIndex={joinIndex}
        bind:domTable={domJoin}
        selectable
        on:keydown={joinKeyDown}
        columns={[{ fieldName: 'name', header: _t('insertJoin.joinType', { defaultMessage: 'Join type' }) }]}
      />

      <div class="m-1">{_t('insertJoin.alias', { defaultMessage: 'Alias' })}</div>
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
      value={_t('common.ok', { defaultMessage: 'OK' })}
      on:click={() => {
        closeCurrentModal();
        onInsert(sqlPreview);
      }}
    />
    <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
  </svelte:fragment>
</ModalBase>

<style>
  .sql {
    position: relative;
    height: 80px;
    width: 40vw;
  }
</style>
