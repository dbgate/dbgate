<script lang="ts">
  import InlineButton from '../buttons/InlineButton.svelte';
  import SelectField from '../forms/SelectField.svelte';

  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { runOperationOnDatabase } from '../modals/ConfirmSqlModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { appliedCurrentSchema, currentDatabase } from '../stores';
  import { switchCurrentDatabase } from '../utility/common';
  import { extractDbNameFromComposite, extractSchemaNameFromComposite, findDefaultSchema } from 'dbgate-tools';
  import { _t } from '../translations';

  export let schemaList;
  export let objectList;

  export let conid;
  export let database;
  export let connection;

  export let negativeMarginTop = false;

  export let driver;

  let selectedSchema = null;

  $: valueStorageKey = `selected-schema-${conid}-${database}`;

  $: {
    if (selectedSchema != null) {
      $appliedCurrentSchema = selectedSchema;
    } else {
      const usedSchemas = Object.keys(countBySchema);
      const defaultSchema = findDefaultSchema(schemaList, driver?.dialect);
      if (usedSchemas.length == 1 && usedSchemas[0] == defaultSchema) {
        $appliedCurrentSchema = usedSchemas[0];
      } else {
        $appliedCurrentSchema = null;
      }
    }
  }

  function computeCountBySchema(list) {
    const res = {};
    for (const item of list) {
      if (!item.schemaName) continue;
      if (!res[item.schemaName]) res[item.schemaName] = 0;
      res[item.schemaName] += 1;
    }
    return res;
  }

  $: realSchemaList = _.uniq(
    _.compact([selectedSchema, ...Object.keys(countBySchema), ...(schemaList?.map(x => x.schemaName) ?? [])])
  );
  $: countBySchema = computeCountBySchema(objectList ?? []);

  function handleCreateSchema() {
    showModal(InputTextModal, {
      header: _t('schema.createSchema', { defaultMessage: 'Create schema' }),
      value: 'newschema',
      label: _t('schema.schemaName', { defaultMessage: 'Schema name' }),
      onConfirm: async name => {
        const dbid = { conid, database };
        await runOperationOnDatabase(
          dbid,
          {
            type: 'createSchema',
            schemaName: name,
          },
          'schema-list-changed'
        );
        if (selectedSchema) {
          selectedSchema = name;
        }
      },
    });
  }
  function handleDropSchema() {
    showModal(ConfirmModal, {
      message: `Really drop schema ${$appliedCurrentSchema}?`,
      onConfirm: async () => {
        const dbid = { conid, database };
        runOperationOnDatabase(
          dbid,
          {
            type: 'dropSchema',
            schemaName: $appliedCurrentSchema,
          },
          'schema-list-changed'
        );
        selectedSchema = null;
      },
    });
  }

  $: if (connection?.useSeparateSchemas) {
    selectedSchema =
      extractSchemaNameFromComposite($currentDatabase?.name) ?? findDefaultSchema(schemaList, driver?.dialect);
  } else {
    selectedSchema = localStorage.getItem(valueStorageKey ?? '');
  }
</script>

{#if realSchemaList.length > 0}
  <div class="wrapper" class:negativeMarginTop>
    <div class="mr-1">{_t('common.schema', { defaultMessage: 'Schema' })}:</div>
    <SelectField
      isNative
      options={connection?.useSeparateSchemas
        ? (schemaList?.map(x => ({ label: x.schemaName, value: x.schemaName })) ?? [])
        : [
            {
              label: _t('schema.all_schemas', {
                defaultMessage: 'All schemas ({count})',
                values: { count: objectList?.length ?? 0 },
              }),
              value: '',
            },
            ...realSchemaList.map(x => ({ label: `${x} (${countBySchema[x] ?? 0})`, value: x })),
          ]}
      value={selectedSchema ?? $appliedCurrentSchema ?? ''}
      on:change={e => {
        if (connection?.useSeparateSchemas) {
          switchCurrentDatabase({
            connection,
            name: `${extractDbNameFromComposite(database)}::${e.detail}`,
          });
        } else {
          selectedSchema = e.detail;
        }
        localStorage.setItem(valueStorageKey, e.detail);
      }}
      selectClass="schema-select"
    />

    {#if selectedSchema != null}
      <InlineButton
        on:click={() => {
          selectedSchema = null;
          localStorage.removeItem(valueStorageKey);
        }}
        title={_t('schema.resetToDefault', { defaultMessage: 'Reset to default' })}
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    {/if}
    <InlineButton on:click={handleCreateSchema} title={_t('schema.add', { defaultMessage: 'Add new schema' })} square>
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
    <InlineButton
      on:click={handleDropSchema}
      title={_t('schema.delete', { defaultMessage: 'Delete schema' })}
      square
      disabled={!$appliedCurrentSchema}
    >
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
  }

  .negativeMarginTop {
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
