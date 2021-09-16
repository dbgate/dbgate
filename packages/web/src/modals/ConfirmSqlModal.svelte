<script>
  import _ from 'lodash';
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let sql;
  export let onConfirm;
  export let engine;
  export let recreates;

  $: isRecreated = _.sum(_.values(recreates || {})) > 0;

  $: console.log('recreates', recreates);
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Save changes</div>

    <div class="editor">
      <SqlEditor {engine} value={sql} readOnly />
    </div>

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
      <FormValues let:values>
        <FormSubmit
          value="OK"
          disabled={isRecreated && !values.allowRecreate}
          on:click={() => {
            closeCurrentModal();
            onConfirm();
          }}
        />
        <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      </FormValues>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }

  .form-margin {
    margin: var(--dim-large-form-margin);
  }
</style>
