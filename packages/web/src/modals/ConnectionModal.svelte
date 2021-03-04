<script lang="ts">
  import registerCommand from '../commands/registerCommand';
  import FormButton from '../forms/FormButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';

  import ModalBase from './ModalBase.svelte';
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Add connection</div>
    xxx
    <div slot="footer" class="flex">
      <div class="buttons">
        <FormButton value="Test" />
        <FormSubmit value="Save" on:click={() => console.log('SAVE')} />
      </div>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .buttons {
    flex-shrink: 0;
  }
</style>
