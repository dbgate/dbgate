<script context='module'>
  export function saveScriptToDatabase({ conid, database }, sql, syncModel = true) {
    await apiCall('database-connections/run-script', {
        conid,
        database,
        sql,
    });

    const { errorMessage } = resp || {};
    if (errorMessage) {
        showModal(ErrorMessageModal, { title: 'Error when executing script', message: errorMessage });
    } else {
        showSnackbarSuccess('Saved to database');
        if (syncModel) apiCall('database-connections/sync-model', { conid, database });
    }
  }
</script>

<script>
  import _, { startsWith } from 'lodash';
  import { writable } from 'svelte/store';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import newQuery from '../query/newQuery';
  import SqlEditor from '../query/SqlEditor.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let sql;
  export let onConfirm;
  export let engine;
  export let recreates;
  export let deleteCascadesScripts;

  $: isRecreated = _.sum(_.values(recreates || {})) > 0;
  const values = writable({});

  // $: console.log('recreates', recreates);
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <div slot="header">Save changes</div>

    <div class="editor">
      <SqlEditor
        {engine}
        value={$values.deleteReferencesCascade
          ? [
              ...deleteCascadesScripts
                .filter(({ script, title }) => $values[`deleteReferencesFor_${title}`] !== false)
                .map(({ script, title }) => script),
              sql,
            ].join('\n')
          : sql}
        readOnly
      />
    </div>

    {#if !_.isEmpty(deleteCascadesScripts)}
      <div class="mt-2">
        <FormCheckboxField
          templateProps={{ noMargin: true }}
          label="Delete references CASCADE"
          name="deleteReferencesCascade"
        />
      </div>
    {/if}

    {#if $values.deleteReferencesCascade}
      <div class="form-margin flex">
        <FormStyledButton
          value="Check all"
          on:click={() => {
            $values = _.omitBy($values, (v, k) => k.startsWith('deleteReferencesFor_'));
          }}
        />
        <FormStyledButton
          value="Uncheck all"
          on:click={() => {
            const newValues = { ...$values };
            for (const item of deleteCascadesScripts) {
              newValues[`deleteReferencesFor_${item.title}`] = false;
            }
            $values = newValues;
          }}
        />
      </div>

      <div class="form-margin flex flex-wrap">
        {#each _.sortBy(deleteCascadesScripts, 'title') as deleteTable}
          <div class="mr-1 nowrap">
            <FormCheckboxField
              defaultValue={true}
              templateProps={{ noMargin: true }}
              label={deleteTable.title}
              name={`deleteReferencesFor_${deleteTable.title}`}
            />
          </div>
        {/each}
      </div>
    {/if}

    {#if isRecreated}
      <div class="form-margin">
        <div>
          <FontIcon icon="img warn" /> This operation is not directly supported by SQL engine. DbGate can emulate it, but
          please check the generated SQL script.
        </div>
        <FormCheckboxField
          templateProps={{ noMargin: true }}
          label="Allow recreate (don't use on production databases)"
          name="allowRecreate"
        />
      </div>
    {/if}

    <div slot="footer">
      <FormSubmit
        value="OK"
        disabled={isRecreated && !$values.allowRecreate}
        on:click={e => {
          closeCurrentModal();
          onConfirm(
            e.detail.deleteReferencesCascade
              ? [
                  ...deleteCascadesScripts
                    .filter(({ script, title }) => e.detail[`deleteReferencesFor_${title}`] !== false)
                    .map(({ script, title }) => script),
                  sql,
                ].join('\n')
              : null
          );
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      <FormStyledButton
        type="button"
        value="Open script"
        on:click={() => {
          newQuery({
            initialData: sql,
          });

          closeCurrentModal();
        }}
      />
    </div>
  </ModalBase>
</FormProviderCore>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }

  .form-margin {
    margin: var(--dim-large-form-margin);
  }

  .flex-wrap {
    flex-wrap: wrap;
  }
</style>
