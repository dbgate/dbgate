<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;

  export const createMatcher =
    (filter, cfg = DEFAULT_SEARCH_SETTINGS) =>
    data => {
      const filterArgs = [];
      if (cfg.columnName) filterArgs.push(data.columnName);
      if (cfg.columnComment) filterArgs.push(data.columnComment);
      if (cfg.columnDataType) filterArgs.push(data.dataType);

      const res = filterName(filter, ...filterArgs);
      return res;
    };
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getColumnIcon } from '../elements/ColumnLabel.svelte';
  import { renameDatabaseObjectDialog, alterDatabaseDialog } from '../utility/alterDatabaseTools';

  import AppObjectCore from './AppObjectCore.svelte';
  import { DEFAULT_SEARCH_SETTINGS } from '../stores';
  import { filterName } from 'dbgate-tools';

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
      { text: 'Copy name', onClick: () => navigator.clipboard.writeText(data.columnName) },
    ];
  }

  function getExtInfo(data) {
    const res = [];
    if (data.foreignKey) {
      res.push(`${data.dataType} -> ${data.foreignKey.refTableName}`);
    } else {
      res.push(data.dataType);
    }
    if (data.columnComment) {
      res.push(data.columnComment);
    }
    if (res.length > 0) return res.join(', ');
    return null;
  }

  $: extInfo = getExtInfo(data);
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
