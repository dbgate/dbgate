<script lang="ts">
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import { extensions } from '../stores';
  import { _t } from '../translations';
  import { getFormContext } from '../forms/SettingsFormProvider.svelte';
  import Link from '../elements/Link.svelte';

  export let settingsPrefix = 'settings.drivers';
  export let headingKey = 'settings.activeDrivers';
  export let defaultHeading = 'Active drivers';
  export let translationPrefix = 'settings.drivers';

  const context = getFormContext();

  function handleCheckAll(isChecked) {
    $extensions.drivers.forEach(driver => {
      context.setFieldValue(`${settingsPrefix}.${driver.title}`, isChecked);
    });
  }
</script>

<div class="wrapper">
  <FormValues let:values>
    <div class="heading-wrapper">
      <div class="heading">{_t(headingKey, { defaultMessage: defaultHeading })}</div>
    </div>
    <div class="actions">
      <Link onClick={() => handleCheckAll(true)}>{_t('settings.checkAll', { defaultMessage: 'Check all' })}</Link>
      |
      <Link onClick={() => handleCheckAll(false)}>{_t('settings.uncheckAll', { defaultMessage: 'Uncheck all' })}</Link>
    </div>
    {#each $extensions.drivers as driver, index}
      <FormCheckboxField
        name="{settingsPrefix}.{driver.title}"
        label={_t(translationPrefix + '.' + driver.title, {
          defaultMessage: driver.title,
        })}
        defaultValue={true}
      />
    {/each}
  </FormValues>
</div>

<style>
  .heading-wrapper {
    display: flex;
    align-items: center;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
    margin-right: var(--dim-large-form-margin);
    margin-bottom: 5px;
  }

  .heading {
    font-size: 20px;
  }

  .actions {
    margin-left: var(--dim-large-form-margin);
    margin-bottom: 10px;
  }

  .wrapper :global(input) {
    max-width: 400px;
  }

  .wrapper :global(select) {
    max-width: 400px;
  }
</style>
