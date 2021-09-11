<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;
</script>

<script lang="ts">
  import { getColumnIcon } from '../elements/ColumnLabel.svelte';
  import { renameDatabaseObjectDialog } from '../utility/alterDatabaseTools';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  function handleRenameColumn() {
    renameDatabaseObjectDialog(data.conid, data.database, data.columnName, (db, newName) => ({
      ...db,
      tables: db.tables.map(tbl =>
        tbl.schemaName == data.schemaName && tbl.pureName == data.pureName
          ? {
              ...tbl,
              columns: tbl.columns.map(
                col =>
                  (col.columnName = data.columnName
                    ? {
                        ...col,
                        columnName: newName,
                      }
                    : col)
              ),
            }
          : tbl
      ),
    }));
  }

  function handleDropColumn() {}

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
