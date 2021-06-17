<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;

</script>

<script lang="ts">
  import { generateTablePairingId } from 'dbgate-tools';

  import _ from 'lodash';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import ConstraintLabel from '../elements/ConstraintLabel.svelte';
  import ForeignKeyObjectListControl from '../elements/ForeignKeyObjectListControl.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import useEditorData from '../query/useEditorData';
  import TableEditor from '../tableeditor/TableEditor.svelte';

  import { useDbCore } from '../utility/metadataLoaders';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField = 'tables';

  $: tableInfo = useDbCore({ conid, database, schemaName, pureName, objectTypeField });
  $: tableInfoWithPairingId = $tableInfo ? generateTablePairingId($tableInfo) : null;

  const { editorState, editorValue, setEditorData } = useEditorData({ tabid });

  $: showTable = $editorValue || tableInfoWithPairingId;

</script>

<TableEditor
  tableInfo={showTable}
  setTableInfo={objectTypeField == 'tables'
    ? tableInfoUpdater =>
        setEditorData(tbl => {
          if (tbl) return tableInfoUpdater(tbl);
          return tableInfoUpdater(tableInfoWithPairingId);
        })
    : null}
/>
