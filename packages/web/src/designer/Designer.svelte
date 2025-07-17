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
    // testEnabled: () => !!getCurrentEditor(),
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

  registerCommand({
    id: 'diagram.deleteSelectedTables',
    category: 'Designer',
    toolbarName: 'Remove',
    name: 'Remove selected tables',
    icon: 'icon delete',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().deleteSelectedTables(),
    testEnabled: () => getCurrentEditor()?.areTablesSelected(),
  });
</script>

<script lang="ts">
  import DesignerTable from './DesignerTable.svelte';
  import { isConnectedByReference } from './designerTools';
  import uuidv1 from 'uuid/v1';
  import { getTableInfo, useDatabaseInfo, useUsedApps } from '../utility/metadataLoaders';
  import cleanupDesignColumns from './cleanupDesignColumns';
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import { tick } from 'svelte';
  import contextMenu from '../utility/contextMenu';
  import stableStringify from 'json-stable-stringify';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { GraphDefinition, GraphLayout } from './GraphLayout';
  import { saveFileToDisk } from '../utility/exportFileTools';
  import { apiCall } from '../utility/api';
  import moveDrag from '../utility/moveDrag';
  import { rectanglesHaveIntersection } from './designerMath';
  import { showModal } from '../modals/modalTools';
  import ChooseColorModal from '../modals/ChooseColorModal.svelte';
  import { currentThemeDefinition } from '../stores';
  import { chooseTopTables, DIAGRAM_DEFAULT_WATERMARK, DIAGRAM_ZOOMS, extendDatabaseInfoFromApps } from 'dbgate-tools';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import DragColumnMemory from './DragColumnMemory.svelte';
  import createRef from '../utility/createRef';
  import { isProApp } from '../utility/proTools';
  import dragScroll from '../utility/dragScroll';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  export let value;
  export let onChange;
  export let conid;
  export let database;
  export let menu;
  export let settings;
  export let referenceComponent;
  export let onReportCounts = undefined;
  export let allowAddTablesButton = false;

  export const activator = createActivator('Designer', true);

  let domCanvas;
  let domWrapper;
  let canvasWidth = 3000;
  let canvasHeight = 3000;
  let dragStartPoint = null;
  let dragCurrentPoint = null;
  export let columnFilter;
  export let showColumnFilter = true;

  const sourceDragColumn$ = writable(null);
  const targetDragColumn$ = writable(null);

  const dbInfo = settings?.updateFromDbInfo ? useDatabaseInfo({ conid, database }) : null;
  $: dbInfoExtended = $dbInfo ? extendDatabaseInfoFromApps($dbInfo, $apps) : null;

  $: tables =
    (value?.tables
      ? chooseTopTables(
          value?.tables,
          value?.style?.topTables,
          value?.style?.tableFilter,
          value?.style?.omitTablesFilter
        )
      : value?.tables) || ([] as any[]);
  $: references = (value?.references || [])?.filter(
    ref => tables.find(x => x.designerId == ref.sourceId) && tables.find(x => x.designerId == ref.targetId)
  ) as any[];
  $: zoomKoef = settings?.customizeStyle && value?.style?.zoomKoef ? value?.style?.zoomKoef : 1;
  $: apps = useUsedApps();

  $: isMultipleTableSelection = tables.filter(x => x.isSelectedTable).length >= 2;

  let tableRefs = {};
  const referenceRefs = {};
  let domTables;
  $: {
    tableRefs;
    recomputeDomTables();
  }

  function recomputeDomTables() {
    domTables = _.pickBy(_.mapValues(tableRefs, (tbl: any) => tbl?.getDomTable()));
  }

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
    if (dbInfoExtended) {
      updateFromDbInfo(dbInfoExtended as any);
    }
  }

  $: {
    detectSize(tables, domTables);
  }

  $: {
    if (dbInfoExtended && value?.autoLayout) {
      performAutoActions(dbInfoExtended);
    }
  }

  function updateFromDbInfo(db = 'auto') {
    if (db == 'auto' && dbInfo) db = dbInfoExtended as any;
    if (!settings?.updateFromDbInfo || !db) return;

    onChange(current => {
      let newTables = current.tables || [];
      for (const table of current.tables || []) {
        const dbTable = (db.tables || []).find(
          x => x?.pureName == table?.pureName && x?.schemaName == table?.schemaName
        );
        if (
          stableStringify(_.pick(dbTable, ['columns', 'primaryKey', 'foreignKeys'])) !=
          stableStringify(_.pick(table, ['columns', 'primaryKey', 'foreignKeys']))
        ) {
          newTables = _.compact(newTables).map(x =>
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
          for (const fk of table.foreignKeys || []) {
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
    const maxX = rects.length > 0 ? _.max(rects.map(x => x.right)) : 0;
    const maxY = rects.length > 0 ? _.max(rects.map(x => x.bottom)) : 0;

    canvasWidth = Math.max(3000, maxX + 50);
    canvasHeight = Math.max(3000, maxY + 50);
  }

  function callChange(changeFunc, skipUndoChain = undefined, settings = undefined) {
    onChange(changeFunc, skipUndoChain, settings);
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

  const selectTable = (table, addToSelection) => {
    callChange(
      current => ({
        ...current,
        tables: (current.tables || []).map(x =>
          x.designerId == table.designerId
            ? { ...x, isSelectedTable: true }
            : { ...x, isSelectedTable: addToSelection ? x.isSelectedTable : false }
        ),
      }),
      true
    );
  };

  const removeTable = table => {
    if (isMultipleTableSelection && settings?.useDatabaseReferences && settings?.canSelectTables) {
      callChange(current => ({
        ...current,
        tables: (current.tables || []).filter(x => !x.isSelectedTable),
      }));
      updateFromDbInfo();
    } else {
      callChange(
        current => ({
          ...current,
          tables: (current.tables || []).filter(x => x.designerId != table.designerId),
          references: (current.references || []).filter(
            x => x.sourceId != table.designerId && x.targetId != table.designerId
          ),
          columns: (current.columns || []).filter(x => x.designerId != table.designerId),
        }),
        undefined,
        { removeTables: true }
      );
    }
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
    if (!dbInfoExtended) return;
    const db = dbInfoExtended;
    if (!db) return;
    callChange(current => {
      return getTablesWithReferences(db, table, current);
    });
    updateFromDbInfo();
    await tick();

    const rect = (domTables[table.designerId] as any)?.getRect();
    arrange(true, false, rect ? { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 } : null);
  };

  const handleAddAllTables = async () => {
    const db = dbInfoExtended;
    if (!db) return;
    callChange(current => ({
      tables: db.tables.map(table => ({
        ...table,
        designerId: `${table.pureName}-${uuidv1()}`,
      })),
      references: [],
      autoLayout: true,
    }));
  };

  const handleChangeTableColor = table => {
    showModal(ChooseColorModal, {
      onChange: color => {
        callChange(current => {
          return {
            ...current,
            tables: (current?.tables || []).map(table =>
              table.isSelectedTable
                ? {
                    ...table,
                    tableColor: color,
                  }
                : table
            ),
          };
        });
      },
    });
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
    if (objectTypeField != 'tables' && objectTypeField != 'views' && objectTypeField != 'collections') return;
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

  function forEachSelected(op: Function) {
    for (const tbl of _.values(tableRefs)) {
      const table = tbl as any;
      if (!table?.isSelected()) continue;
      op(table);
    }
  }

  const tableMoveStart = () => {
    forEachSelected(t => t.moveStart());
  };
  const tableMove = (x, y) => {
    forEachSelected(t => t.move(x, y));
    tick().then(recomputeReferencePositions);
  };
  const tableMoveEnd = () => {
    const moves = {};
    forEachSelected(t => {
      moves[t.getDesignerId()] = t.moveEnd();
    });
    callChange(current => {
      return {
        ...current,
        tables: (current?.tables || []).map(table => {
          const position = moves[table.designerId];
          return position
            ? {
                ...table,
                left: position.left,
                top: position.top,
              }
            : table;
        }),
      };
    });

    tick().then(recomputeReferencePositions);
  };

  const handleMoveStart = (x, y) => {
    dragStartPoint = { x: x / zoomKoef, y: y / zoomKoef };
  };
  const handleMove = (dx, dy, x, y) => {
    dragCurrentPoint = { x: x / zoomKoef, y: y / zoomKoef };
  };
  const handleMoveEnd = (x, y) => {
    if (dragStartPoint && dragCurrentPoint) {
      const bounds = {
        left: Math.min(dragStartPoint.x, dragCurrentPoint.x),
        right: Math.max(dragStartPoint.x, dragCurrentPoint.x),
        top: Math.min(dragStartPoint.y, dragCurrentPoint.y),
        bottom: Math.max(dragStartPoint.y, dragCurrentPoint.y),
      };

      callChange(
        current => ({
          ...current,
          tables: (current.tables || []).map(x => {
            const domTable = domTables[x.designerId] as any;
            if (domTable) {
              const rect = domTable.getRect();
              const rectZoomed = {
                left: rect.left / zoomKoef,
                right: rect.right / zoomKoef,
                top: rect.top / zoomKoef,
                bottom: rect.bottom / zoomKoef,
              };
              return {
                ...x,
                isSelectedTable: rectanglesHaveIntersection(rectZoomed, bounds),
              };
            }
          }),
        }),
        true
      );
    }

    dragStartPoint = null;
    dragCurrentPoint = null;
  };

  function recomputeReferencePositions() {
    for (const ref of Object.values(referenceRefs) as any[]) {
      if (ref) ref.recomputePosition(zoomKoef);
    }
  }

  export function canArrange() {
    return !!settings?.arrangeAlg;
  }

  export function canExport() {
    return settings?.canExport;
  }

  // export function arrange(skipUndoChain = false) {
  //   switch (settings?.arrangeAlg) {
  //     case 'springy':
  //       arrange_springy(skipUndoChain);
  //       break;
  //     case 'tree':
  //       arrange_tree(skipUndoChain);
  //       break;
  //   }
  // }

  export function arrange(skipUndoChain = false, arrangeAll = true, circleMiddle = { x: 0, y: 0 }) {
    const graph = new GraphDefinition();
    for (const table of tables || []) {
      const domTable = domTables[table.designerId] as any;
      if (!domTable) continue;
      const rect = domTable.getRect();
      graph.addNode(
        table.designerId,
        (rect.right - rect.left) / zoomKoef,
        (rect.bottom - rect.top) / zoomKoef,
        arrangeAll || table.needsArrange
          ? null
          : {
              x: (rect.left + rect.right) / 2 / zoomKoef,
              y: (rect.top + rect.bottom) / 2 / zoomKoef,
            }
      );
    }

    for (const reference of settings?.sortAutoLayoutReferences
      ? settings?.sortAutoLayoutReferences(references)
      : references) {
      graph.addEdge(reference.sourceId, reference.targetId);
    }

    graph.initialize();

    let layout: GraphLayout;
    switch (settings?.arrangeAlg) {
      case 'springy':
        layout = GraphLayout
          // initial circle layout
          .createCircle(graph, circleMiddle)
          // simulation with Hook's, Coulomb's and gravity law
          .springyAlg()
          // move nodes to avoid overlaps
          .solveOverlaps()
          // view box starts with [0,0]
          .fixViewBox();
        break;
      case 'tree':
        layout = GraphLayout.createTree(graph, value?.rootDesignerId);
        break;
    }

    if (!layout) {
      return;
    }

    // layout.print();

    callChange(
      current => {
        return {
          ...current,
          tables: _.compact(current?.tables || []).map(table => {
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
      },
      skipUndoChain,
      { isCalledFromArrange: true }
    );
  }

  function getWatermarkHtml() {
    const replaceLinks = text =>
      text.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" style="color: var(--theme-font-link)" target="_blank">$1</a>'
      );

    if (value?.style?.omitExportWatermark) return null;
    if (value?.style?.exportWatermark) {
      return replaceLinks(value?.style?.exportWatermark);
    }
    return replaceLinks(DIAGRAM_DEFAULT_WATERMARK);
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
    if ($currentThemeDefinition?.themeCss) {
      if (css) css += '\n';
      css += $currentThemeDefinition?.themeCss;
    }
    css += ' body { overflow: scroll; }';
    saveFileToDisk(async filePath => {
      await apiCall('files/export-diagram', {
        filePath,
        html: domCanvas.outerHTML,
        css,
        themeType: $currentThemeDefinition?.themeType,
        themeClassName: $currentThemeDefinition?.themeClassName,
        watermark: getWatermarkHtml(),
      });
    });
  }

  const changeStyleFunc = (name, value) => () => {
    callChange(current => {
      return {
        ...current,
        style: {
          ...current?.style,
          [name]: value,
        },
      };
    });
  };

  function createMenu() {
    return [
      menu,
      settings?.customizeStyle && [
        { divider: true },
        isProApp() && {
          text: 'Column properties',
          submenu: [
            {
              text: `Nullability: ${value?.style?.showNullability ? 'YES' : 'NO'}`,
              onClick: changeStyleFunc('showNullability', !value?.style?.showNullability),
            },
            {
              text: `Data type: ${value?.style?.showDataType ? 'YES' : 'NO'}`,
              onClick: changeStyleFunc('showDataType', !value?.style?.showDataType),
            },
          ],
        },
        isProApp() && {
          text: `Columns - ${_.startCase(value?.style?.filterColumns || 'all')}`,
          submenu: [
            {
              text: 'All',
              onClick: changeStyleFunc('filterColumns', ''),
            },
            {
              text: 'Primary Key',
              onClick: changeStyleFunc('filterColumns', 'primaryKey'),
            },
            {
              text: 'All Keys',
              onClick: changeStyleFunc('filterColumns', 'allKeys'),
            },
            {
              text: 'Not Null',
              onClick: changeStyleFunc('filterColumns', 'notNull'),
            },
            {
              text: 'Keys And Not Null',
              onClick: changeStyleFunc('filterColumns', 'keysAndNotNull'),
            },
          ],
        },
        {
          text: `Zoom - ${(value?.style?.zoomKoef || 1) * 100}%`,
          submenu: DIAGRAM_ZOOMS.map(koef => ({
            text: `${koef * 100} %`,
            onClick: changeStyleFunc('zoomKoef', koef.toString()),
          })),
        },
      ],
    ];
  }

  $: {
    columnFilter;
    tick().then(() => {
      recomputeReferencePositions();
      recomputeDomTables();
    });
  }

  const oldTopTablesRef = createRef(value?.style?.topTables);
  $: {
    if (value?.style?.topTables > 0 && oldTopTablesRef.get() != value?.style?.topTables) {
      oldTopTablesRef.set(value?.style?.topTables);
      tick().then(() => {
        arrange();
        tick().then(() => {
          recomputeReferencePositions();
          recomputeDomTables();
        });
      });
    }
  }

  function handleWheel(event) {
    if (event.ctrlKey) {
      event.preventDefault();
      let zoomIndex = DIAGRAM_ZOOMS.findIndex(x => x == value?.style?.zoomKoef);
      if (zoomIndex < 0) zoomIndex = DIAGRAM_ZOOMS.findIndex(x => x == 1);

      let newZoomIndex = zoomIndex;
      if (event.deltaY < 0) {
        newZoomIndex += 1;
      }
      if (event.deltaY > 0) {
        newZoomIndex -= 1;
      }
      if (newZoomIndex < 0) {
        newZoomIndex = 0;
      }
      if (newZoomIndex >= DIAGRAM_ZOOMS.length) {
        newZoomIndex = DIAGRAM_ZOOMS.length - 1;
      }
      const newZoomKoef = DIAGRAM_ZOOMS[newZoomIndex];

      callChange(
        current => ({
          ...current,
          style: {
            ...current?.style,
            zoomKoef: newZoomKoef.toString(),
          },
        }),
        true
      );
    }
  }

  function handleDragScroll(x, y) {
    domWrapper.scrollLeft -= x;
    domWrapper.scrollTop -= y;
  }

  const oldZoomKoefRef = createRef(value?.style?.zoomKoef || 1);
  $: {
    if (
      domWrapper &&
      value?.style?.zoomKoef != oldZoomKoefRef.get() &&
      value?.style?.zoomKoef > 0 &&
      oldZoomKoefRef.get() > 0
    ) {
      domWrapper.scrollLeft = Math.round((domWrapper.scrollLeft / oldZoomKoefRef.get()) * value?.style?.zoomKoef);
      domWrapper.scrollTop = Math.round((domWrapper.scrollTop / oldZoomKoefRef.get()) * value?.style?.zoomKoef);
    }
    oldZoomKoefRef.set(value?.style?.zoomKoef);
  }

  // $: console.log('DESIGNER VALUE', value);

  // $: console.log('TABLES ARRAY', tables);

  // $: {
  //   if (value?.tables?.find(x => !x)) {
  //     console.log('**** INCORRECT DESIGNER VALUE**** ', value);
  //   }
  // }
  // $: {
  //   if (value?.tables?.length < 100) {
  //     console.log('**** SMALL TABLES**** ', value);
  //   }
  // }

  $: if (onReportCounts) {
    // console.log('REPORTING COUNTS');
    onReportCounts({
      all: _.compact(value?.tables || []).length,
      filtered: _.compact(tables || []).length,
    });
  }

  export function areTablesSelected() {
    return tables.some(x => x.isSelectedTable);
  }

  export function deleteSelectedTables() {
    callChange(current => ({
      ...current,
      tables: (current.tables || []).filter(x => !x.isSelectedTable),
    }));
    updateFromDbInfo();
  }
</script>

<div
  class="wrapper noselect"
  use:contextMenu={createMenu}
  on:wheel={handleWheel}
  bind:this={domWrapper}
  use:dragScroll={handleDragScroll}
>
  {#if !(tables?.length > 0)}
    <div class="empty">Drag &amp; drop tables or views from left panel here</div>

    {#if allowAddTablesButton}
      <div class="addAllTables">
        <FormStyledButton value="Add all tables" on:click={handleAddAllTables} />
      </div>
    {/if}
  {/if}

  <div
    class="canvas"
    bind:this={domCanvas}
    on:dragover={e => e.preventDefault()}
    on:drop={handleDrop}
    style={`width:${canvasWidth / zoomKoef}px;height:${canvasHeight / zoomKoef}px;
      ${settings?.customizeStyle && value?.style?.zoomKoef ? `transform:scale(${value?.style?.zoomKoef});transform-origin: top left;` : ''}
    `}
    on:mousedown={e => {
      if (e.button == 0 && settings?.canSelectTables) {
        callChange(
          current => ({
            ...current,
            tables: (current.tables || []).map(x => ({ ...x, isSelectedTable: false })),
          }),
          true
        );
      }
    }}
    use:moveDrag={settings?.canSelectTables ? [handleMoveStart, handleMove, handleMoveEnd] : null}
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
        {zoomKoef}
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
        onChangeTableColor={handleChangeTableColor}
        onMoveReferences={recomputeReferencePositions}
        {columnFilter}
        {table}
        {conid}
        {database}
        {zoomKoef}
        {isMultipleTableSelection}
        onChangeTable={changeTable}
        onBringToFront={bringToFront}
        onSelectTable={selectTable}
        onRemoveTable={removeTable}
        onMoveStart={tableMoveStart}
        onMove={tableMove}
        onMoveEnd={tableMoveEnd}
        {domCanvas}
        designer={value}
        {sourceDragColumn$}
        {targetDragColumn$}
        {settings}
      />
    {/each}

    {#if dragStartPoint && dragCurrentPoint}
      <svg class="drag-rect">
        <polyline
          points={`
        ${dragStartPoint.x},${dragStartPoint.y}
        ${dragStartPoint.x},${dragCurrentPoint.y}
        ${dragCurrentPoint.x},${dragCurrentPoint.y}
        ${dragCurrentPoint.x},${dragStartPoint.y}
        ${dragStartPoint.x},${dragStartPoint.y}
    `}
        />
      </svg>
    {/if}
  </div>
  {#if showColumnFilter && tables?.length > 0}
    <div class="panel">
      <DragColumnMemory {settings} {sourceDragColumn$} {targetDragColumn$} />
      <div class="searchbox">
        <SearchInput bind:value={columnFilter} placeholder="Filter columns" />
        <CloseSearchButton bind:filter={columnFilter} />
      </div>
    </div>
  {/if}
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
    position: absolute;
  }

  .addAllTables {
    margin: 50px;
    margin-top: 100px;
    font-size: 20px;
    position: absolute;
    z-index: 100;
  }
  .canvas {
    position: relative;
  }
  .panel {
    position: absolute;
    right: 16px;
    top: 0;
    display: flex;
  }
  .searchbox {
    width: 200px;
    display: flex;
    margin-left: 1px;
  }

  svg.drag-rect {
    visibility: hidden;
    pointer-events: none;
  }
  :global(.dbgate-screen) svg.drag-rect {
    visibility: visible;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
  :global(.dbgate-screen) svg.drag-rect polyline {
    fill: none;
    stroke: var(--theme-bg-4);
    stroke-width: 2;
  }
</style>
