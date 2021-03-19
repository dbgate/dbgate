<script lang="ts" context="module">
</script>

<script lang="ts">
  import DesignerTable from './DesignerTable.svelte';
  import { isConnectedByReference } from './designerTools';
  import uuidv1 from 'uuid/v1';
  import { getTableInfo } from '../utility/metadataLoaders';
  import cleanupDesignColumns from './cleanupDesignColumns';
  import _ from 'lodash';
  import createRef from '../utility/createRef';
  import DesignerReference from './DesignerReference.svelte';
  import { writable } from 'svelte/store';
  import { tick } from 'svelte';
  import contextMenu from '../utility/contextMenu';

  export let value;
  export let onChange;
  export let conid;
  export let database;
  // export let menu;

  let domCanvas;

  const sourceDragColumn$ = writable(null);
  const targetDragColumn$ = writable(null);

  $: tables = value?.tables as any[];
  $: references = value?.references as any[];

  const tableRefs = {};
  const referenceRefs = {};
  $: domTables = _.pickBy(_.mapValues(tableRefs, (tbl: any) => tbl?.getDomTable()));

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

  function callChange(changeFunc, skipUndoChain = undefined) {
    onChange(changeFunc, skipUndoChain);
    tick().then(recomputeReferencePositions);
  }

  const changeTable = table => {
    callChange(current => ({
      ...current,
      tables: fixPositions((current.tables || []).map(x => (x.designerId == table.designerId ? table : x))),
    }));
  };

  const bringToFront = table => {
    callChange(
      current => ({
        ...current,
        tables: [...(current.tables || []).filter(x => x.designerId != table.designerId), table],
      }),
      true
    );
  };

  const removeTable = table => {
    callChange(current => ({
      ...current,
      tables: (current.tables || []).filter(x => x.designerId != table.designerId),
      references: (current.references || []).filter(
        x => x.sourceId != table.designerId && x.targetId != table.designerId
      ),
      columns: (current.columns || []).filter(x => x.designerId != table.designerId),
    }));
  };

  const changeReference = ref => {
    callChange(current => ({
      ...current,
      references: (current.references || []).map(x => (x.designerId == ref.designerId ? ref : x)),
    }));
  };

  const removeReference = ref => {
    callChange(current => ({
      ...current,
      references: (current.references || []).filter(x => x.designerId != ref.designerId),
    }));
  };

  const handleCreateReference = (source, target) => {
    callChange(current => {
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
    callChange(current => {
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
    callChange(
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
    callChange(current => {
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

  const handleDrop = e => {
    var data = e.dataTransfer.getData('app_object_drag_data');
    e.preventDefault();
    if (!data) return;
    const rect = e.target.getBoundingClientRect();
    var json = JSON.parse(data);
    const { objectTypeField } = json;
    if (objectTypeField != 'tables' && objectTypeField != 'views') return;
    json.designerId = uuidv1();
    json.left = e.clientX - rect.left;
    json.top = e.clientY - rect.top;

    callChange(current => {
      const foreignKeys = _.compact([
        ...(json.foreignKeys || []).map(fk => {
          const tables = ((current || {}).tables || []).filter(
            tbl => fk.refTableName == tbl.pureName && fk.refSchemaName == tbl.schemaName
          );
          if (tables.length == 1)
            return {
              ...fk,
              sourceId: json.designerId,
              targetId: tables[0].designerId,
            };
          return null;
        }),
        ..._.flatten(
          ((current || {}).tables || []).map(tbl =>
            (tbl.foreignKeys || []).map(fk => {
              if (fk.refTableName == json.pureName && fk.refSchemaName == json.schemaName) {
                return {
                  ...fk,
                  sourceId: tbl.designerId,
                  targetId: json.designerId,
                };
              }
              return null;
            })
          )
        ),
      ]);

      return {
        ...current,
        tables: [...((current || {}).tables || []), json],
        references:
          foreignKeys.length == 1
            ? [
                ...((current || {}).references || []),
                {
                  designerId: uuidv1(),
                  sourceId: foreignKeys[0].sourceId,
                  targetId: foreignKeys[0].targetId,
                  joinType: 'INNER JOIN',
                  columns: foreignKeys[0].columns.map(col => ({
                    source: col.columnName,
                    target: col.refColumnName,
                  })),
                },
              ]
            : (current || {}).references,
      };
    });
  };

  function recomputeReferencePositions() {
    for (const ref of Object.values(referenceRefs) as any[]) {
      if (ref) ref.recomputePosition();
    }
  }
</script>

<div class="wrapper">
  {#if !(tables?.length > 0)}
    <div class="empty">Drag &amp; drop tables or views from left panel here</div>
  {/if}

  <div class="canvas" bind:this={domCanvas} on:dragover={e => e.preventDefault()} on:drop={handleDrop}>
    {#each references || [] as ref (ref.designerId)}
      <DesignerReference
        bind:this={referenceRefs[ref.designerId]}
        {domTables}
        reference={ref}
        onChangeReference={changeReference}
        onRemoveReference={removeReference}
        designer={value}
      />
    {/each}
    <!-- 
                {sourceDragColumn}
        {setSourceDragColumn}
        {targetDragColumn}
        {setTargetDragColumn}

                {setChangeToken}
        onChangeDomTable={table => {
          domTablesRef.current[table.designerId] = table;
        }} -->

    {#each tables || [] as table (table.designerId)}
      <DesignerTable
        bind:this={tableRefs[table.designerId]}
        onCreateReference={handleCreateReference}
        onSelectColumn={handleSelectColumn}
        onChangeColumn={handleChangeColumn}
        onAddReferenceByColumn={handleAddReferenceByColumn}
        onMoveReferences={recomputeReferencePositions}
        {table}
        onChangeTable={changeTable}
        onBringToFront={bringToFront}
        onRemoveTable={removeTable}
        {domCanvas}
        designer={value}
        {sourceDragColumn$}
        {targetDragColumn$}
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
