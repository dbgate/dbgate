<script lang="ts">
  import {
    createPerspectiveNodeConfig,
    MultipleDatabaseInfo,
    PerspectiveConfig,
    perspectiveNodesHaveStructure,
    PerspectiveTreeNode,
    switchPerspectiveReferenceDirection,
  } from 'dbgate-datalib';
  import _ from 'lodash';
  import { tick } from 'svelte';
  import runCommand from '../commands/runCommand';

  import Designer from '../designer/Designer.svelte';
  import QueryDesignerReference from '../designer/QueryDesignerReference.svelte';
  import { currentDatabase } from '../stores';
  import { getPerspectiveNodeMenu } from './perspectiveMenu';

  export let config: PerspectiveConfig;
  export let dbInfos: MultipleDatabaseInfo;
  export let root: PerspectiveTreeNode;

  export let conid;
  export let database;

  export let setConfig;

  function createDesignerModel(config: PerspectiveConfig, dbInfos: MultipleDatabaseInfo) {
    return {
      ...config,
      tables: _.compact(
        config.nodes.map(node => {
          const table = dbInfos?.[node.conid || conid]?.[node.database || database]?.tables?.find(
            x => x.pureName == node.pureName && x.schemaName == node.schemaName
          );
          const view = dbInfos?.[node.conid || conid]?.[node.database || database]?.views?.find(
            x => x.pureName == node.pureName && x.schemaName == node.schemaName
          );
          if (!table && !view) return null;

          const { designerId } = node;
          return {
            ...(table || view),
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
    setConfig(oldValue => {
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

            // if (table) {
            //   nodeChanged.alias = table?.alias;
            // }

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
        if ($currentDatabase?.name != database) {
          newNode.database = $currentDatabase?.name;
        }
        if ($currentDatabase?.connection?._id != conid) {
          newNode.conid = $currentDatabase?.connection?._id;
        }
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

  async function detectAutoArrange(config: PerspectiveConfig, dbInfos, root) {
    if (
      root &&
      config.nodes.find(x => !x.position) &&
      perspectiveNodesHaveStructure(config, dbInfos, conid, database) &&
      config.nodes.every(x => root.findNodeByDesignerId(x.designerId))
    ) {
      await tick();
      runCommand('designer.arrange');
    }
  }

  $: detectAutoArrange(config, dbInfos, root);

  // $: console.log('DESIGNER ROOT', root);
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
      const node = root.findNodeByDesignerId(designerId);
      const child = node.childNodes.find(x => x.columnName == column.columnName);
      return getPerspectiveNodeMenu({
        config,
        setConfig,
        conid,
        database,
        root,
        node: child,
        designerId,
      });
    },
    tableMenu: ({ designer, designerId, onRemoveTable }) => {
      const node = root.findNodeByDesignerId(designerId);
      return [
        { text: 'Remove', onClick: () => onRemoveTable({ designerId }) },
        getPerspectiveNodeMenu({
          config,
          setConfig,
          conid,
          database,
          root,
          node,
          designerId,
        }),
      ];
    },
    createReferenceText: reference => (reference.isAutoGenerated ? 'FK' : 'Custom'),
    isColumnChecked: (designerId, columnName) => {
      return config.nodes.find(x => x.designerId == designerId)?.checkedColumns?.includes(columnName);
    },
    setColumnChecked: (designerId, columnName, value) => {
      setConfig(cfg => ({
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
      setConfig(cfg => ({
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
    isColumnFiltered: (designerId, columnName) => {
      return !!config.nodes.find(x => x.designerId == designerId)?.filters?.[columnName];
    },
    getMainTableIcon: designerId => {
      const node = root?.findNodeByDesignerId(designerId);
      if (!node) return null;
      const level = node?.level + 1;
      if (level == 1) return `icon num-${level}`;
      if (level <= 9) return `icon num-${level}-outline`;
      return 'icon num-9-plus';
    },
    sortAutoLayoutReferences: references => {
      // console.log('sortAutoLayoutReferences', root, references.length);
      return _.sortBy(references, reference => {
        const node1 = root?.findNodeByDesignerId(reference.sourceId);
        const node2 = root?.findNodeByDesignerId(reference.targetId);
        if (!node1 || !node2) return 10000;
        if (node1.level > node2.level) reference = switchPerspectiveReferenceDirection(reference);
        const index = _.findIndex(node1.childNodes, x => x.columnName == reference.columns[0].source);
        return index;
      });
    },
    referencePaintSettings: {
      buswi: 10,
      extwi: 10,
    },
    canAddDesignerForeignKey: (designerId, columnName) => {
      const node = root?.findNodeByDesignerId(designerId);
      const child = node?.childNodes?.find(x => x.columnName == columnName);
      return child?.isExpandable && !child?.designerId && !child?.isCircular;
    },
    addDesignerForeignKey: (designerId, columnName) => {
      const node = root?.findNodeByDesignerId(designerId);
      const child = node?.childNodes?.find(x => x.columnName == columnName);
      child?.toggleCheckedNode(true);
    },
    tableSpecificDb: designerId => {
      const node = config.nodes.find(x => x.designerId == designerId);
      if (node?.conid || node?.database) {
        return {
          conid: node.conid,
          database: node.database,
        };
      }
    },
    hasFilterParentRowsFlag: designerId => !!config.nodes.find(x => x.designerId == designerId)?.isParentFilter,
  }}
  referenceComponent={QueryDesignerReference}
  value={createDesignerModel(config, dbInfos)}
  onChange={handleChange}
/>
