<script lang="ts" context="module">
</script>

<script lang="ts">
  import DesignerTable from './DesignerTable.svelte';
  import { isConnectedByReference } from './designerTools';
  import uuidv1 from 'uuid/v1';
  import { getTableInfo } from '../utility/metadataLoaders';
  import cleanupDesignColumns from './cleanupDesignColumns';
  import _ from 'lodash';

  export let value;
  export let onChange;
  export let conid;
  export let database;

  let domWrapper;

  $: tables = value?.tables as any[];
  $: references = value?.references as any[];

  function fixPositions(tables) {
    const minLeft = _.min(tables.map(x => x.left));
    const minTop = _.min(tables.map(x => x.top));
    if (minLeft < 0 || minTop < 0) {
      const dLeft = minLeft < 0 ? -minLeft : 0;
      const dTop = minTop < 0 ? -minTop : 0;
      return tables.map(tbl => ({
        ...tbl,
        left: tbl.left + dLeft,
        top: tbl.top + dTop,
      }));
    }
    return tables;
  }

  const changeTable = table => {
    onChange(current => ({
      ...current,
      tables: fixPositions((current.tables || []).map(x => (x.designerId == table.designerId ? table : x))),
    }));
  };

  const bringToFront = table => {
    onChange(
      current => ({
        ...current,
        tables: [...(current.tables || []).filter(x => x.designerId != table.designerId), table],
      }),
      true
    );
  };

  const removeTable = table => {
    onChange(current => ({
      ...current,
      tables: (current.tables || []).filter(x => x.designerId != table.designerId),
      references: (current.references || []).filter(
        x => x.sourceId != table.designerId && x.targetId != table.designerId
      ),
      columns: (current.columns || []).filter(x => x.designerId != table.designerId),
    }));
  };

  const changeReference = ref => {
    onChange(current => ({
      ...current,
      references: (current.references || []).map(x => (x.designerId == ref.designerId ? ref : x)),
    }));
  };

  const removeReference = ref => {
    onChange(current => ({
      ...current,
      references: (current.references || []).filter(x => x.designerId != ref.designerId),
    }));
  };

  const handleCreateReference = (source, target) => {
    onChange(current => {
      const existingReference = (current.references || []).find(
        x =>
          (x.sourceId == source.designerId && x.targetId == target.designerId) ||
          (x.sourceId == target.designerId && x.targetId == source.designerId)
      );

      return {
        ...current,
        references: existingReference
          ? current.references.map(ref =>
              ref == existingReference
                ? {
                    ...existingReference,
                    columns: [
                      ...existingReference.columns,
                      existingReference.sourceId == source.designerId
                        ? {
                            source: source.columnName,
                            target: target.columnName,
                          }
                        : {
                            source: target.columnName,
                            target: source.columnName,
                          },
                    ],
                  }
                : ref
            )
          : [
              ...(current.references || []),
              {
                designerId: uuidv1(),
                sourceId: source.designerId,
                targetId: target.designerId,
                joinType: isConnectedByReference(current, source, target, null) ? 'CROSS JOIN' : 'INNER JOIN',
                columns: [
                  {
                    source: source.columnName,
                    target: target.columnName,
                  },
                ],
              },
            ],
      };
    });
  };

  const handleAddReferenceByColumn = async (designerId, foreignKey) => {
    const toTable = await getTableInfo({
      conid,
      database,
      pureName: foreignKey.refTableName,
      schemaName: foreignKey.refSchemaName,
    });
    const newTableDesignerId = uuidv1();
    onChange(current => {
      const fromTable = (current.tables || []).find(x => x.designerId == designerId);
      if (!fromTable) return;
      return {
        ...current,
        tables: [
          ...(current.tables || []),
          {
            ...toTable,
            left: fromTable.left + 300,
            top: fromTable.top + 50,
            designerId: newTableDesignerId,
          },
        ],
        references: [
          ...(current.references || []),
          {
            designerId: uuidv1(),
            sourceId: fromTable.designerId,
            targetId: newTableDesignerId,
            joinType: 'INNER JOIN',
            columns: foreignKey.columns.map(col => ({
              source: col.columnName,
              target: col.refColumnName,
            })),
          },
        ],
      };
    });
  };

  const handleSelectColumn = column => {
    onChange(
      current => ({
        ...current,
        columns: (current.columns || []).find(
          x => x.designerId == column.designerId && x.columnName == column.columnName
        )
          ? current.columns
          : [...cleanupDesignColumns(current.columns), _.pick(column, ['designerId', 'columnName'])],
      }),
      true
    );
  };

  const handleChangeColumn = (column, changeFunc) => {
    onChange(current => {
      const currentColumns = (current || {}).columns || [];
      const existing = currentColumns.find(x => x.designerId == column.designerId && x.columnName == column.columnName);
      if (existing) {
        return {
          ...current,
          columns: currentColumns.map(x => (x == existing ? changeFunc(existing) : x)),
        };
      } else {
        return {
          ...current,
          columns: [...cleanupDesignColumns(currentColumns), changeFunc(_.pick(column, ['designerId', 'columnName']))],
        };
      }
    });
  };
</script>

<div class="wrapper" bind:this={domWrapper}>
  {#if !(tables?.length > 0)}
    <div class="empty">Drag &amp; drop tables or views from left panel here</div>
  {/if}

  <div class="canvas">
    <!-- {#each references || [] as ref (ref.designerId)}
      <DesignerReference
        {changeToken}
        {domTablesRef}
        reference={ref}
        onChangeReference={changeReference}
        onRemoveReference={removeReference}
        designer={value}
      />
        {/each} 

                {sourceDragColumn}
        {setSourceDragColumn}
        {targetDragColumn}
        {setTargetDragColumn}

                {setChangeToken}
        onChangeDomTable={table => {
          domTablesRef.current[table.designerId] = table;
        }}

  -->

    {#each tables || [] as table (table.designerId)}
      <DesignerTable
        onCreateReference={handleCreateReference}
        onSelectColumn={handleSelectColumn}
        onChangeColumn={handleChangeColumn}
        onAddReferenceByColumn={handleAddReferenceByColumn}
        {table}
        onChangeTable={changeTable}
        onBringToFront={bringToFront}
        onRemoveTable={removeTable}
        {domWrapper}
        designer={value}
      />
    {/each}
  </div>
</div>

<style>
  .wrapper {
    flex: 1;
    background-color: var(--theme-bg-1);
    overflow: scroll;
  }
  .empty {
    margin: 50px;
    font-size: 20px;
  }
  .canvas {
    width: 3000px;
    height: 3000px;
    position: relative;
  }
</style>
