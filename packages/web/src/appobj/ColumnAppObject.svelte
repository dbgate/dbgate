<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getColumnIcon } from '../elements/ColumnLabel.svelte';
  import { renameDatabaseObjectDialog, alterDatabaseDialog } from '../utility/alterDatabaseTools';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  function handleRenameColumn() {
    renameDatabaseObjectDialog(data.conid, data.database, data.columnName, (db, newName) => {
      const tbl = db.tables.find(x => x.schemaName == data.schemaName && x.pureName == data.pureName);
      const col = tbl.columns.find(x => x.columnName == data.columnName);
      col.columnName = newName;
    });
  }

  function handleDropColumn() {
    alterDatabaseDialog(data.conid, data.database, db => {
      const tbl = db.tables.find(x => x.schemaName == data.schemaName && x.pureName == data.pureName);
      _.remove(tbl.columns as any[], x => x.columnName == data.columnName);
    });
  }

  function createMenu() {
    return [
      { text: 'Rename column', onClick: handleRenameColumn },
      { text: 'Drop column', onClick: handleDropColumn },
    ];
  }

  $: extInfo = data.foreignKey ? `${data.dataType} -> ${data.foreignKey.refTableName}` : data.dataType;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.columnName}
  {extInfo}
  icon={getColumnIcon(data, true)}
  menu={createMenu}
  disableHover
/>
