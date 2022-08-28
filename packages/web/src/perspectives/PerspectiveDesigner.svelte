<script lang="ts">
  import {
    createPerspectiveNodeConfig,
    MultipleDatabaseInfo,
    PerspectiveConfig,
    perspectiveNodesHaveStructure,
  } from 'dbgate-datalib';
  import _, { findIndex } from 'lodash';
  import { tick } from 'svelte';
  import runCommand from '../commands/runCommand';

  import Designer from '../designer/Designer.svelte';
  import QueryDesignerReference from '../designer/QueryDesignerReference.svelte';
  import { addToPerspectiveSort, clearPerspectiveSort, setPerspectiveSort } from './perspectiveMenu';

  export let config: PerspectiveConfig;
  export let dbInfos: MultipleDatabaseInfo;

  export let conid;
  export let database;

  export let onChange;

  function createDesignerModel(config: PerspectiveConfig, dbInfos: MultipleDatabaseInfo) {
    return {
      ...config,
      tables: _.compact(
        config.nodes.map(node => {
          const table = dbInfos?.[node.conid || conid]?.[node.database || database]?.tables?.find(
            x => x.pureName == node.pureName && x.schemaName == node.schemaName
          );
          if (!table) return null;

          const { designerId } = node;
          return {
            ...table,
            left: node?.position?.x || 0,
            top: node?.position?.y || 0,
            alias: node.alias,
            designerId,
          };
        })
      ),
    };
  }

  function handleChange(value, skipUndoChain, settings) {
    onChange(oldValue => {
      const newValue = _.isFunction(value) ? value(createDesignerModel(oldValue, dbInfos)) : value;
      let isArranged = oldValue.isArranged;
      if (settings?.isCalledFromArrange) {
        isArranged = true;
      }
      const res = {
        ...oldValue,
        references: newValue.references,
        nodes: _.compact(
          oldValue.nodes.map(node => {
            const table = newValue.tables?.find(x => x.designerId == node.designerId);

            const nodeChanged = {
              ...node,
            };

            if (table) {
              nodeChanged.alias = table?.alias;
            }

            if (settings?.isCalledFromArrange) {
              // when called from arrange, position must be set to prevent cycle
              nodeChanged.position = { x: table?.left || 0, y: table?.top || 0 };
            }

            if (!table && settings?.removeTables) {
              return null;
            }

            if (table && (table.left != node.position?.x || table.top != node.position?.y)) {
              if (!settings?.isCalledFromArrange) {
                isArranged = false;
              }
              nodeChanged.position = { x: table.left, y: table.top };
            }

            return nodeChanged;
          })
        ),
      };

      for (const table of newValue.tables) {
        if (res.nodes.find(x => x.designerId == table.designerId)) {
          continue;
        }
        const newNode = createPerspectiveNodeConfig(table);
        newNode.designerId = table.designerId;
        newNode.position = { x: table.left, y: table.top };
        isArranged = false;
        res.nodes.push(newNode);
      }

      res.isArranged = isArranged;
      if (!res.nodes.find(x => x.designerId == res.rootDesignerId)) {
        res.rootDesignerId = res.nodes[0]?.designerId;
      }

      return res;
    });
  }

  async function detectAutoArrange(config: PerspectiveConfig, dbInfos) {
    if (config.nodes.find(x => !x.position) && perspectiveNodesHaveStructure(config, dbInfos, conid, database)) {
      await tick();
      runCommand('designer.arrange');
    }
  }

  $: detectAutoArrange(config, dbInfos);
</script>

<Designer
  {...$$props}
  settings={{
    showTableCloseButton: true,
    allowColumnOperations: true,
    allowCreateRefByDrag: true,
    allowScrollColumns: true,
    canSelectColumns: true,
    canCheckTables: true,
    allowTableAlias: true,
    arrangeAlg: 'tree',
    referenceMenu: ({ designer, reference, onChangeReference, onRemoveReference }) => {
      return [{ text: 'Remove', onClick: () => onRemoveReference(reference) }];
    },
    columnMenu: ({ designer, designerId, column, foreignKey }) => {
      return [
        {
          text: 'Sort ascending',
          onClick: () => onChange(cfg => setPerspectiveSort(cfg, designerId, column.columnName, 'ASC')),
        },
        {
          text: 'Sort descending',
          onClick: () => onChange(cfg => setPerspectiveSort(cfg, designerId, column.columnName, 'DESC')),
        },
        {
          text: 'Add to sort ascending',
          onClick: () => onChange(cfg => addToPerspectiveSort(cfg, designerId, column.columnName, 'ASC')),
        },
        {
          text: 'Add to sort descending',
          onClick: () => onChange(cfg => addToPerspectiveSort(cfg, designerId, column.columnName, 'DESC')),
        },
        {
          text: 'Clear sort criteria',
          onClick: () => onChange(cfg => clearPerspectiveSort(cfg, designerId)),
        },
      ];
    },
    createReferenceText: reference => (reference.isAutoGenerated ? 'FK' : 'Custom'),
    isColumnChecked: (designerId, columnName) => {
      return config.nodes.find(x => x.designerId == designerId)?.checkedColumns?.includes(columnName);
    },
    setColumnChecked: (designerId, columnName, value) => {
      onChange(cfg => ({
        ...cfg,
        nodes: cfg.nodes.map(node =>
          node.designerId == designerId
            ? {
                ...node,
                checkedColumns: value
                  ? [...(node.checkedColumns || []), columnName]
                  : (node.checkedColumns || []).filter(x => x != columnName),
              }
            : node
        ),
      }));
    },
    isTableChecked: designerId => config.nodes?.find(x => x.designerId == designerId)?.isNodeChecked,
    setTableChecked: (designerId, value) => {
      onChange(cfg => ({
        ...cfg,
        nodes: cfg.nodes.map(node =>
          node.designerId == designerId
            ? {
                ...node,
                isNodeChecked: value,
              }
            : node
        ),
      }));
    },
    getSortOrderProps: (designerId, columnName) => {
      const sort = config.nodes.find(x => x.designerId == designerId)?.sort;
      const order = sort?.find(x => x.columnName == columnName)?.order;
      if (!order) return null;
      const orderIndex = sort.length > 1 ? _.findIndex(sort, x => x.columnName == columnName) : -1;
      return { order, orderIndex };
    },
  }}
  referenceComponent={QueryDesignerReference}
  value={createDesignerModel(config, dbInfos)}
  onChange={handleChange}
/>
