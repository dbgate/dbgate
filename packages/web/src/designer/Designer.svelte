<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('Designer');

  registerCommand({
    id: 'designer.arrange',
    category: 'Designer',
    icon: 'icon arrange',
    name: 'Arrange',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.canArrange(),
    onClick: () => getCurrentEditor().arrange(),
  });

  registerCommand({
    id: 'diagram.export',
    category: 'Designer',
    toolbarName: 'Export diagram',
    name: 'Export diagram',
    icon: 'icon report',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().exportDiagram(),
    testEnabled: () => getCurrentEditor()?.canExport(),
  });
</script>

<script lang="ts">
  import DesignerTable from './DesignerTable.svelte';
  import { isConnectedByReference } from './designerTools';
  import uuidv1 from 'uuid/v1';
  import { getTableInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import cleanupDesignColumns from './cleanupDesignColumns';
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import { tick } from 'svelte';
  import contextMenu from '../utility/contextMenu';
  import stableStringify from 'json-stable-stringify';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { GraphDefinition, GraphLayout } from './GraphLayout';
  import { saveFileToDisk } from '../utility/exportElectronFile';
  import { apiCall } from '../utility/api';

  export let value;
  export let onChange;
  export let conid;
  export let database;
  export let menu;
  export let settings;
  export let referenceComponent;

  export const activator = createActivator('Designer', true);

  let domCanvas;
  let canvasWidth = 3000;
  let canvasHeight = 3000;

  const sourceDragColumn$ = writable(null);
  const targetDragColumn$ = writable(null);

  const dbInfo = settings?.updateFromDbInfo ? useDatabaseInfo({ conid, database }) : null;

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

  $: {
    if (dbInfo) {
      updateFromDbInfo($dbInfo);
    }
  }

  $: {
    detectSize(tables, domTables);
  }

  $: {
    if (dbInfo && value?.autoLayout) {
      performAutoActions($dbInfo);
    }
  }

  function updateFromDbInfo(db = 'auto') {
    if (db == 'auto' && dbInfo) db = $dbInfo;
    if (!settings?.updateFromDbInfo || !db) return;

    onChange(current => {
      let newTables = current.tables || [];
      for (const table of current.tables || []) {
        const dbTable = (db.tables || []).find(x => x.pureName == table.pureName && x.schemaName == table.schemaName);
        if (
          stableStringify(_.pick(dbTable, ['columns', 'primaryKey', 'foreignKeys'])) !=
          stableStringify(_.pick(table, ['columns', 'primaryKey', 'foreignKeys']))
        ) {
          newTables = newTables.map(x =>
            x == table
              ? {
                  ...table,
                  ..._.pick(dbTable, ['columns', 'primaryKey', 'foreignKeys']),
                }
              : x
          );
        }
      }

      let references = current?.references;
      if (settings?.useDatabaseReferences) {
        references = [];
        for (const table of newTables) {
          for (const fk of table.foreignKeys) {
            const dst = newTables.find(x => x.pureName == fk.refTableName && x.schemaName == fk.refSchemaName);
            if (!dst) continue;
            references.push({
              designerId: uuidv1(),
              sourceId: table.designerId,
              targetId: dst.designerId,
              joinType: '',
              columns: fk.columns.map(col => ({
                source: col.columnName,
                target: col.refColumnName,
              })),
            });
          }
        }
      }

      return {
        ...current,
        tables: newTables,
        references,
      };
    }, true);
  }

  async function detectSize(tables, domTables) {
    await tick();
    const rects = _.values(domTables).map(x => x.getRect());
    const maxX = _.max(rects.map(x => x.right));
    const maxY = _.max(rects.map(x => x.bottom));

    canvasWidth = Math.max(3000, maxX + 50);
    canvasHeight = Math.max(3000, maxY + 50);
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
    const newTableDesignerId = `${toTable.pureName}-${uuidv1()}`;
    callChange(current => {
      const fromTable = (current.tables || []).find(x => x.designerId == designerId);
      if (!fromTable) return current;
      const alias = getNewTableAlias(toTable, current.tables);
      if (alias && !settings?.allowTableAlias) return current;
      return {
        ...current,
        tables: [
          ...(current.tables || []),
          {
            ...toTable,
            left: fromTable.left + 300,
            top: fromTable.top + 50,
            designerId: newTableDesignerId,
            alias,
          },
        ],
        references: settings?.allowCreateRefByDrag
          ? [
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
            ]
          : current.references,
      };
    });
    updateFromDbInfo();
  };

  const getTablesWithReferences = (db, table, current) => {
    const dbTable = db.tables?.find(x => x.pureName == table.pureName && x.schemaName == table.schemaName);
    if (!dbTable) return;

    const newTables = [];
    for (const fk of dbTable.foreignKeys || []) {
      const existing = [...current.tables, ...newTables].find(
        x => x.pureName == fk.refTableName && x.schemaName == fk.refSchemaName
      );
      if (!existing) {
        const dst = db.tables.find(x => x.pureName == fk.refTableName && x.schemaName == fk.refSchemaName);
        if (dst) newTables.push(dst);
      }
    }
    for (const fk of dbTable.dependencies || []) {
      const existing = [...current.tables, ...newTables].find(
        x => x.pureName == fk.pureName && x.schemaName == fk.schemaName
      );
      if (!existing) {
        const dst = db.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
        if (dst) newTables.push(dst);
      }
    }

    return {
      ...current,
      tables: [
        ...current.tables,
        ...newTables.map(x => ({
          ...x,
          designerId: `${x.pureName}-${uuidv1()}`,
          needsArrange: true,
        })),
      ],
    };
  };

  const handleAddTableReferences = async table => {
    if (!dbInfo) return;
    const db = $dbInfo;
    if (!db) return;
    callChange(current => {
      return getTablesWithReferences(db, table, current);
    });
    updateFromDbInfo();
    await tick();

    const rect = (domTables[table.designerId] as any)?.getRect();
    arrange(true, false, rect ? { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 } : null);
  };

  const performAutoActions = async db => {
    if (!db) return;

    callChange(current => {
      for (const table of current?.tables || []) {
        if (table.autoAddReferences) current = getTablesWithReferences(db, table, current);
      }

      return {
        ...current,
        autoLayout: false,
        tables: (current?.tables || []).map(tbl => ({ ...tbl, autoAddReferences: false })),
      };
    });
    updateFromDbInfo();
    await tick();
    arrange();
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

  const getNewTableAlias = (table, tables) => {
    const usedAliases = (tables || []).map(x => x.alias || x.pureName);
    if (!usedAliases.includes(table.pureName)) return null;
    let index = 2;
    while (usedAliases.includes(`${table.pureName}${index}`)) index += 1;
    return `${table.pureName}${index}`;
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
    json.designerId = `${json.pureName}-${uuidv1()}`;
    json.left = e.clientX - rect.left;
    json.top = e.clientY - rect.top;

    callChange(current => {
      const foreignKeys = settings?.useDatabaseReferences
        ? []
        : _.compact([
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

      const alias = getNewTableAlias(json, current?.tables);
      if (alias && !settings?.allowTableAlias) return current;

      return {
        ...current,
        tables: [
          ...((current || {}).tables || []),
          {
            ...json,
            alias,
          },
        ],
        references:
          foreignKeys.length == 1
            ? [
                ...((current || {}).references || []),
                {
                  designerId: `${current?.pureName}-${uuidv1()}`,
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
    updateFromDbInfo();
  };

  function recomputeReferencePositions() {
    for (const ref of Object.values(referenceRefs) as any[]) {
      if (ref) ref.recomputePosition();
    }
  }

  export function canArrange() {
    return settings?.canArrange;
  }

  export function canExport() {
    return settings?.canExport;
  }

  export function arrange(skipUndoChain = false, arrangeAll = true, circleMiddle = { x: 0, y: 0 }) {
    const graph = new GraphDefinition();
    for (const table of value?.tables || []) {
      const domTable = domTables[table.designerId] as any;
      if (!domTable) continue;
      const rect = domTable.getRect();
      graph.addNode(
        table.designerId,
        rect.right - rect.left,
        rect.bottom - rect.top,
        arrangeAll || table.needsArrange ? null : { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
      );
    }

    for (const reference of value?.references) {
      graph.addEdge(reference.sourceId, reference.targetId);
    }

    graph.initialize();

    const layout = GraphLayout.createCircle(graph, circleMiddle).springyAlg().doMoveSteps().fixViewBox();
    // layout.print();

    callChange(current => {
      return {
        ...current,
        tables: (current?.tables || []).map(table => {
          const node = layout.nodes[table.designerId];
          // console.log('POSITION', position);
          return node
            ? {
                ...table,
                needsArrange: false,
                left: node.left,
                top: node.top,
              }
            : {
                ...table,
                needsArrange: false,
              };
        }),
      };
    }, skipUndoChain);
  }

  export async function exportDiagram() {
    const cssLinks = ['global.css', 'build/bundle.css'];
    let css = '';
    for (const link of cssLinks) {
      const cssResp = await fetch(link);
      const cssItem = await cssResp.text();
      if (css) css += '\n';
      css += cssItem;
    }
    saveFileToDisk(async filePath => {
      await apiCall('files/export-diagram', {
        filePath,
        html: domCanvas.outerHTML,
        css,
      });
    });
  }
</script>

<div class="wrapper noselect" use:contextMenu={menu}>
  {#if !(tables?.length > 0)}
    <div class="empty">Drag &amp; drop tables or views from left panel here</div>
  {/if}

  <div
    class="canvas"
    bind:this={domCanvas}
    on:dragover={e => e.preventDefault()}
    on:drop={handleDrop}
    style={`width:${canvasWidth}px;height:${canvasHeight}px;`}
  >
    {#each references || [] as ref (ref.designerId)}
      <svelte:component
        this={referenceComponent}
        bind:this={referenceRefs[ref.designerId]}
        {domTables}
        reference={ref}
        onChangeReference={changeReference}
        onRemoveReference={removeReference}
        designer={value}
        {settings}
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
        onAddAllReferences={handleAddTableReferences}
        onMoveReferences={recomputeReferencePositions}
        {table}
        onChangeTable={changeTable}
        onBringToFront={bringToFront}
        onRemoveTable={removeTable}
        {domCanvas}
        designer={value}
        {sourceDragColumn$}
        {targetDragColumn$}
        {settings}
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
    position: relative;
  }
</style>
