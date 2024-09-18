<script lang="ts">
  import InlineButton from '../buttons/InlineButton.svelte';
  import SelectField from '../forms/SelectField.svelte';

  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';
  import { DatabaseInfo } from 'dbgate-types';

  export let dbinfo: DatabaseInfo;
  export let selectedSchema;
  export let objectList;

  export let onApplySelectedSchema;
  let appliedSchema;

  $: {
    if (selectedSchema != null) {
      appliedSchema = selectedSchema;
    } else {
      const usedSchemas = Object.keys(countBySchema);
      if (usedSchemas.length == 1) {
        appliedSchema = usedSchemas[0];
      } else {
        appliedSchema = null;
      }
    }
  }

  $: onApplySelectedSchema(appliedSchema);

  function computeCountBySchema(list) {
    const res = {};
    for (const item of list) {
      if (!item.schemaName) continue;
      if (!res[item.schemaName]) res[item.schemaName] = 0;
      res[item.schemaName] += 1;
    }
    return res;
  }

  $: schemaList = _.uniq(_.compact(dbinfo?.schemas?.map(x => x.schemaName) ?? []));
  $: countBySchema = computeCountBySchema(objectList ?? []);

  function handleAddNewSchema() {
    // runCommand('add-schema', { conid: dbinfo.conid, database: dbinfo.database });
  }
</script>

{#if schemaList.length > 0}
  <div class="wrapper">
    <div class="mr-1">Schema:</div>
    <SelectField
      isNative
      options={[
        { label: `All schemas (${objectList?.length ?? 0})`, value: '' },
        ...schemaList.filter(x => countBySchema[x]).map(x => ({ label: `${x} (${countBySchema[x] ?? 0})`, value: x })),
        ...schemaList.filter(x => !countBySchema[x]).map(x => ({ label: `${x} (${countBySchema[x] ?? 0})`, value: x })),
      ]}
      value={selectedSchema ?? appliedSchema ?? ''}
      on:change={e => {
        selectedSchema = e.detail;
      }}
      selectClass="schema-select"
    />

    {#if selectedSchema != null}
      <InlineButton
        on:click={() => {
          selectedSchema = null;
        }}
        title="Reset to default"
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    {/if}
    <InlineButton on:click={handleAddNewSchema} title="Add new schema" square>
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
    <InlineButton on:click={handleAddNewSchema} title="Delete schema" square>
      <FontIcon icon="icon minus-thick" />
    </InlineButton>
  </div>
{/if}

<style>
  .wrapper {
    display: flex;
    border-bottom: 1px solid var(--theme-border);
    margin-bottom: 5px;
    align-items: center;
    margin-top: -5px;
  }

  :global(.schema-select) {
    flex: 1;
    min-width: 10px;
    min-height: 22px;
    width: 10px;
    border: none;
  }
</style>
