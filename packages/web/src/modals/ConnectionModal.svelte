<script lang="ts">
  import registerCommand from '../commands/registerCommand';
  import FormButton from '../forms/FormButton.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';

  import ModalBase from './ModalBase.svelte';
</script>

<ModalBase {...$$restProps}>
  <div slot="header">Add connection</div>
  xxx
  <div slot="footer" class="flex">
    <div class="buttons">
      <FormButton value="Test" />
      <FormSubmit value="Save" />
    </div>
  </div>
</ModalBase>

<style>
  .buttons {
    flex-shrink: 0;
  }
</style>
