<script lang="ts">
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import { extensions } from '../stores';
  import { _t } from '../translations';
  import _ from 'lodash';
  import { getFormContext } from '../forms/SettingsFormProvider.svelte';

  export let settingsPrefix = 'hiddenDatabaseEngines';
  export let headingKey = 'settings.activeDrivers';
  export let defaultHeading = 'Active drivers';
  export let translationPrefix = 'settings.drivers';

  const context = getFormContext();

  function handleCheckAll(isChecked: boolean) {
    if (!$extensions?.drivers) return;

    if (isChecked) {
      // Show all drivers (empty hidden list)
      context.setFieldValue(settingsPrefix, []);
    } else {
      // Hide all drivers
      context.setFieldValue(settingsPrefix, $extensions.drivers.map(driver => driver.engine));
    }
  }

  function getCheckAllState(values): boolean {
    if (!values) return false;
    if (!$extensions?.drivers) return false;

    const hiddenEngines = values?.[settingsPrefix] || [];
    
    // All checked if none are hidden
    return hiddenEngines.length === 0;
  }

  function isDriverVisible(values, driverEngine: string): boolean {
    if (!values) return true;
    const hiddenEngines = values?.[settingsPrefix] || [];
    return !hiddenEngines.includes(driverEngine);
  }

  function handleDriverToggle(driverEngine: string, isChecked: boolean, values) {
    const hiddenEngines = values?.[settingsPrefix] || [];
    
    if (isChecked) {
      // Remove from hidden list
      context.setFieldValue(settingsPrefix, hiddenEngines.filter(e => e !== driverEngine));
    } else {
      // Add to hidden list
      context.setFieldValue(settingsPrefix, [...hiddenEngines, driverEngine]);
    }
  }
</script>

<div class="wrapper">
  <FormValues let:values>
    <div class="heading-wrapper">
      <div class="heading">{_t(headingKey, { defaultMessage: defaultHeading })}</div>
    </div>
    <FormFieldTemplateLarge
      type="checkbox"
      label={_t('settings.checkAll', { defaultMessage: 'Check all / Uncheck all' })}
      labelProps={{
        onClick: () => handleCheckAll(!getCheckAllState(values)),
      }}
    >
      <CheckboxField
        checked={getCheckAllState(values)}
        on:change={e => handleCheckAll(e.target['checked'])}
      />
    </FormFieldTemplateLarge>
    <div class="br" />
    {#if $extensions?.drivers}
      {#each _.sortBy($extensions.drivers, 'title') as driver, index}
        <FormFieldTemplateLarge
          type="checkbox"
          label={_t(translationPrefix + '.' + driver.title, {
            defaultMessage: driver.title,
          })}
          labelProps={{
            onClick: () => handleDriverToggle(driver.engine, !isDriverVisible(values, driver.engine), values),
          }}
        >
          <CheckboxField
            checked={isDriverVisible(values, driver.engine)}
            on:change={e => handleDriverToggle(driver.engine, e.target['checked'], values)}
          />
        </FormFieldTemplateLarge>
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

  .br {
    background: var(--theme-searchbox-background);
    height: 1px;
    margin: 5px 10px;
    width: 200px;
  }

  .wrapper :global(input) {
    max-width: 400px;
  }

  .wrapper :global(select) {
    max-width: 400px;
  }
</style>
