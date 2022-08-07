<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import TemplatedCheckboxField from '../forms/TemplatedCheckboxField.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import newQuery from '../query/newQuery';
  import { apiCall } from '../utility/api';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let script;
  export let onConfirm;
  export let skipConfirmSettingKey = null;

  let dontAskAgain;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Save changes</div>

    <div class="editor">
      <AceEditor mode="javascript" readOnly value={script} />
    </div>

    {#if skipConfirmSettingKey}
      <div class="mt-2">
        <TemplatedCheckboxField
          label="Don't ask again"
          templateProps={{ noMargin: true }}
          checked={dontAskAgain}
          on:change={e => {
            dontAskAgain = e.detail;
            apiCall('config/update-settings', { [skipConfirmSettingKey]: e.detail });
          }}
        />
      </div>
    {/if}

    <div slot="footer">
      <FormSubmit
        value="OK"
        on:click={() => {
          closeCurrentModal();
          onConfirm();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      <FormStyledButton
        type="button"
        value="Open script"
        on:click={() => {
          newQuery({
            initialData: script,
          });

          closeCurrentModal();
        }}
      />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }
</style>
