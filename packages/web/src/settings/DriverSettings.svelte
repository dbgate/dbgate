<script lang="ts">
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import { extensions } from '../stores';
  import { _t } from '../translations';
  import { getFormContext } from '../forms/SettingsFormProvider.svelte';

  export let settingsPrefix = 'settings.drivers';
  export let headingKey = 'settings.activeDrivers';
  export let defaultHeading = 'Active drivers';
  export let translationPrefix = 'settings.drivers';

  const context = getFormContext();

  function handleCheckAll(isChecked: boolean) {
    if (!$extensions?.drivers) return;

    $extensions.drivers.forEach(driver => {
      context.setFieldValue(`${settingsPrefix}.${driver.title}`, isChecked);
    });
  }

  function getCheckAllState(values): boolean {
    if (!values) return false;
    if (!$extensions?.drivers) return false;

    const checkedCount = $extensions.drivers.filter(driver => values?.[`${settingsPrefix}.${driver.title}`]).length;

    return checkedCount === $extensions.drivers.length;
  }
</script>

<div class="wrapper">
  <FormValues let:values>
    <div class="heading-wrapper">
      <div class="heading">{_t(headingKey, { defaultMessage: defaultHeading })}</div>
    </div>
    <div class="check-all-wrapper">
      <label class="check-all-label">
        <input
          type="checkbox"
          checked={getCheckAllState(values)}
          on:change={e => handleCheckAll(e.currentTarget.checked)}
        />
        <span>{_t('settings.checkAll', { defaultMessage: 'Check all / Uncheck all' })}</span>
      </label>
    </div>
    <div class="br" />
    {#if $extensions?.drivers}
      {#each $extensions.drivers as driver, index}
        <FormCheckboxField
          name="{settingsPrefix}.{driver.title}"
          label={_t(translationPrefix + '.' + driver.title, {
            defaultMessage: driver.title,
          })}
          defaultValue={true}
        />
      {/each}
    {/if}
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

  .check-all-wrapper {
    margin-left: var(--dim-large-form-margin);
    margin-top: 25px;
  }

  .br {
    background: var(--theme-searchbox-background);
    height: 1px;
    margin: 5px 10px;
    width: 200px;
  }

  .check-all-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .check-all-label input[type='checkbox'] {
    cursor: pointer;
  }

  .wrapper :global(input) {
    max-width: 400px;
  }

  .wrapper :global(select) {
    max-width: 400px;
  }
</style>
