<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import newQuery from '../query/newQuery';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let multiTabIndex = undefined;
</script>

<ModalBase simple {...$$restProps}>
  <FormStyledButton
    value="Query"
    on:click={() => {
      newQuery({ multiTabIndex });
      closeCurrentModal();
    }}
  />
</ModalBase>
