<script lang="ts">
  import TextAreaField from '../forms/TextAreaField.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let onFilter;

  let value;
  let group = 'is';

  const handleOk = () => {
    onFilter(group, value);
    closeCurrentModal();
  };
</script>

<ModalBase {...$$restProps}>
  <div slot="header">{_t('filterMultipleValues.filterMultipleValues', { defaultMessage: 'Filter multiple values' })}</div>

  <div class="flex">
    <TextAreaField rows={10} bind:value focused />
    <div>
      <div>
        <input type="radio" bind:group value="is" id="__is" />
        <label for="__is">{_t('filterMultipleValues.isOneOfLine', { defaultMessage: 'Is one of line' })}</label>'
      </div>
      <div>
        <input type="radio" bind:group value="is_not" id="__is_not" />
        <label for="__is_not">{_t('filterMultipleValues.isNotOneOfLine', { defaultMessage: 'Is not one of line' })}</label>'
      </div>
      <div>
        <input type="radio" bind:group value="contains" id="__contains" />
        <label for="__contains">{_t('filterMultipleValues.contains', { defaultMessage: 'Contains' })}</label>'
      </div>
      <div>
        <input type="radio" bind:group value="begins" id="__begins" />
        <label for="__begins">{_t('filterMultipleValues.begins', { defaultMessage: 'Begins' })}</label>'
      </div>
      <div>
        <input type="radio" bind:group value="ends" id="__ends" />
        <label for="__ends">{_t('filterMultipleValues.ends', { defaultMessage: 'Ends' })}</label>'
      </div>
    </div>
  </div>
  <div slot="footer">
    <FormStyledButton value={_t('common.ok', { defaultMessage: 'OK' })} on:click={handleOk} />
    <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
  </div>
</ModalBase>
