<script>
  import FontIcon from '../icons/FontIcon.svelte';
  import DropDownButton from '../elements/DropDownButton.svelte';
  import splitterDrag from '../utility/splitterDrag';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { isTypeDateTime } from 'dbgate-tools';
  import { openDatabaseObjectDetail } from '../appobj/DatabaseObjectAppObject.svelte';
  import { copyTextToClipboard } from '../utility/clipboard';
  import VirtualForeignKeyEditorModal from '../tableeditor/VirtualForeignKeyEditorModal.svelte';
  import { showModal } from '../modals/modalTools';

  export let column;
  export let conid = undefined;
  export let database = undefined;
  export let setSort;
  export let grouping = undefined;
  export let order = undefined;
  export let setGrouping;

  const openReferencedTable = () => {
    openDatabaseObjectDetail('TableDataTab', null, {
      schemaName: column.foreignKey.refSchemaName,
      pureName: column.foreignKey.refTableName,
      conid,
      database,
      objectTypeField: 'tables',
    });
  };

  const handleDefineVirtualForeignKey = () => {
    showModal(VirtualForeignKeyEditorModal, {
      schemaName: column.schemaName,
      pureName: column.pureName,
      conid,
      database,
      columnName: column.columnName,
    });
  };

  function getMenu() {
    return [
      setSort && { onClick: () => setSort('ASC'), text: 'Sort ascending' },
      setSort && { onClick: () => setSort('DESC'), text: 'Sort descending' },
      { onClick: () => copyTextToClipboard(column.columnName), text: 'Copy column name' },

      column.foreignKey && [{ divider: true }, { onClick: openReferencedTable, text: column.foreignKey.refTableName }],

      setGrouping && { divider: true },
      setGrouping && { onClick: () => setGrouping('GROUP'), text: 'Group by' },
      setGrouping && { onClick: () => setGrouping('MAX'), text: 'MAX' },
      setGrouping && { onClick: () => setGrouping('MIN'), text: 'MIN' },
      setGrouping && { onClick: () => setGrouping('SUM'), text: 'SUM' },
      setGrouping && { onClick: () => setGrouping('AVG'), text: 'AVG' },
      setGrouping && { onClick: () => setGrouping('COUNT'), text: 'COUNT' },
      setGrouping && { onClick: () => setGrouping('COUNT DISTINCT'), text: 'COUNT DISTINCT' },

      isTypeDateTime(column.dataType) && [
        { divider: true },
        { onClick: () => setGrouping('GROUP:YEAR'), text: 'Group by YEAR' },
        { onClick: () => setGrouping('GROUP:MONTH'), text: 'Group by MONTH' },
        { onClick: () => setGrouping('GROUP:DAY'), text: 'Group by DAY' },
      ],

      { divider: true },
      { onClick: handleDefineVirtualForeignKey, text: 'Define virtual foreign key' },
    ];
  }
</script>

<div class="header">
  <div class="label">
    {#if grouping}
      <span class="grouping">
        {grouping == 'COUNT DISTINCT' ? 'distinct' : grouping.toLowerCase()}
      </span>
    {/if}
    <ColumnLabel {...column} />
  </div>
  {#if order == 'ASC'}
    <span class="icon">
      <FontIcon icon="img sort-asc" />
    </span>
  {/if}
  {#if order == 'DESC'}
    <span class="icon">
      <FontIcon icon="img sort-desc" />
    </span>
  {/if}
  <DropDownButton menu={getMenu} narrow />
  <div class="horizontal-split-handle resizeHandleControl" use:splitterDrag={'clientX'} on:resizeSplitter />
</div>

<style>
  .header {
    display: flex;
    flex-wrap: nowrap;
  }
  .label {
    flex: 1;
    min-width: 10px;
    padding: 2px;
    margin: auto;
    white-space: nowrap;
  }
  .icon {
    margin-left: 3px;
    align-self: center;
    font-size: 18px;
  }
  /* .resizer {
    background-color: var(--theme-border);
    width: 2px;
    cursor: col-resize;
    z-index: 1;
  } */
  .grouping {
    color: var(--theme-font-alt);
    white-space: nowrap;
  }
</style>
