<script>
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let title = 'Error';
  export let message;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{title}</div>

    <div class="wrapper">
      <div class="icon">
        <FontIcon icon="img error" />
      </div>
      {message}
    </div>

    <div slot="footer">
      <FormStyledButton type="button" value="Close" onClick={closeCurrentModal} />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .wrapper {
    display: flex;
    align-items: center;
  }

  .icon {
    margin-right: 10px;
    font-size: 20pt;
  }
</style>
