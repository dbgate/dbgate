<script lang="ts">
  import { MultipleDatabaseInfo, PerspectiveConfig } from 'dbgate-datalib';
  import _ from 'lodash';
  import { tick } from 'svelte';
  import runCommand from '../commands/runCommand';

  import Designer from '../designer/Designer.svelte';
  import QueryDesignerReference from '../designer/QueryDesignerReference.svelte';

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
        nodes: oldValue.nodes.map(node => {
          const table = newValue.tables?.find(x => x.designerId == node.designerId);
          if (table && (table.left != node.position?.x || table.top != node.position?.y)) {
            if (!settings?.isCalledFromArrange) {
              isArranged = false;
            }
            return {
              ...node,
              position: { x: table.left, y: table.top },
            };
          }
          return node;
        }),
      };
      res.isArranged = isArranged;
      return res;
    });
  }

  async function detectAutoArrange(config: PerspectiveConfig, dbInfos) {
    if (config.isArranged && config.nodes.find(x => !x.position)) {
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
    allowTableAlias: true,
    updateFromDbInfo: false,
    useDatabaseReferences: false,
    allowScrollColumns: true,
    allowAddAllReferences: false,
    canArrange: true,
    canExport: false,
    canSelectColumns: true,
    canSelectTables: false,
    allowChangeColor: false,
    appendTableSystemMenu: false,
    customizeStyle: false,
    allowDefineVirtualReferences: false,
    canCheckTables: true,
    arrangeAlg: 'tree',
  }}
  referenceComponent={QueryDesignerReference}
  value={createDesignerModel(config, dbInfos)}
  onChange={handleChange}
/>
