<script lang="ts">
  import TextAreaField from '../forms/TextAreaField.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onFilter;

  let value;
  let group = 'is';

  const handleOk = () => {
    onFilter(group, value);
    closeCurrentModal();
  };
</script>

<ModalBase {...$$restProps}>
  <div slot="header">Filter multiple values</div>

  <div class="flex">
    <TextAreaField rows={10} bind:value focused />
    <div>
      <div>
        <input type="radio" bind:group value="is" id="__is" />
        <label for="__is">Is one of line</label>'
      </div>
      <div>
        <input type="radio" bind:group value="is_not" id="__is_not" />
        <label for="__is_not">Is not one of line</label>'
      </div>
      <div>
        <input type="radio" bind:group value="contains" id="__contains" />
        <label for="__contains">Contains</label>'
      </div>
      <div>
        <input type="radio" bind:group value="begins" id="__begins" />
        <label for="__begins">Begins</label>'
      </div>
      <div>
        <input type="radio" bind:group value="ends" id="__ends" />
        <label for="__ends">Ends</label>'
      </div>
    </div>
  </div>
  <div slot="footer">
    <FormStyledButton value="OK" on:click={handleOk} />
    <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
  </div>
</ModalBase>
