<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';
  import AceEditor from '../query/AceEditor.svelte';
import newQuery from '../query/newQuery';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let script;
  export let onConfirm;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Save changes</div>

    <div class="editor">
      <AceEditor mode="javascript" readOnly value={script} />
    </div>

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
