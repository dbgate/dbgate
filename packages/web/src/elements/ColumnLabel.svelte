<script context="module" lang="ts">
  export function getColumnIcon(column, forceIcon = false) {
    if (column.autoIncrement) return 'img autoincrement';
    if (column.foreignKey) return 'img foreign-key';
    if (forceIcon) return 'img column';
    return null;
  }
</script>

<script lang="ts">
  import { openDatabaseObjectDetail } from '../appobj/DatabaseObjectAppObject.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import Link from './Link.svelte';

  export let notNull = false;
  export let forceIcon = false;
  export let headerText = '';
  export let columnName = '';
  export let extInfo = null;
  export let dataType = null;
  export let showDataType = false;
  export let foreignKey;
  export let conid = undefined;
  export let database = undefined;
  export let iconOverride = undefined;

  $: icon = iconOverride || getColumnIcon($$props, forceIcon);
</script>

<span class="label" class:notNull>
  {#if icon}
    <FontIcon {icon} />
  {/if}
  {headerText || columnName}
  {#if extInfo}
    <span class="extinfo">{extInfo}</span>
  {/if}
  {#if showDataType}
    {#if foreignKey}
      <span class="extinfo">
        <FontIcon icon="icon arrow-right" />
        {#if conid && database}
          <Link
            onClick={e => {
              e.stopPropagation();

              openDatabaseObjectDetail('TableDataTab', null, {
                schemaName: foreignKey.refSchemaName,
                pureName: foreignKey.refTableName,
                conid,
                database,
                objectTypeField: 'tables',
              });
            }}>{foreignKey.refTableName}</Link
          >
        {:else}
          {foreignKey.refTableName}
        {/if}
      </span>
    {:else if dataType}
      <span class="extinfo">{dataType.toLowerCase()}</span>
    {/if}
  {/if}
</span>

<style>
  .label {
    white-space: nowrap;
  }

  .label.notNull {
    font-weight: bold;
  }

  .extinfo {
    font-weight: normal;
    margin-left: 5px;
    color: var(--theme-font-3);
  }
</style>
