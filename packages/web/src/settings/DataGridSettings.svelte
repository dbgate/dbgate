<script lang="ts">
  import FormCheckboxField from "../forms/FormCheckboxField.svelte";
  import FormSelectField from "../forms/FormSelectField.svelte";
  import FormTextField from "../forms/FormTextField.svelte";
  import { _t } from "../translations";
  import { isProApp } from "../utility/proTools";


</script>

<div class="wrapper">
    <div class="heading">{_t('settings.dataGrid.title', { defaultMessage: 'Data grid' })}</div>
<FormTextField
name="dataGrid.pageSize"
label={_t('settings.dataGrid.pageSize', {
    defaultMessage: 'Page size (number of rows for incremental loading, must be between 5 and 50000)',
})}
defaultValue="100"
/>
{#if isProApp()}
<FormCheckboxField
    name="dataGrid.showHintColumns"
    label={_t('settings.dataGrid.showHintColumns', { defaultMessage: 'Show foreign key hints' })}
    defaultValue={true}
    data-testid="DataGridSettings_showHintColumns"
/>
{/if}
<!-- <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} /> -->

<FormCheckboxField
name="dataGrid.thousandsSeparator"
label={_t('settings.dataGrid.thousandsSeparator', {
    defaultMessage: 'Use thousands separator for numbers',
})}
/>

<FormTextField
name="dataGrid.defaultAutoRefreshInterval"
label={_t('settings.dataGrid.defaultAutoRefreshInterval', {
    defaultMessage: 'Default grid auto refresh interval in seconds',
})}
defaultValue="10"
/>

<FormCheckboxField
name="dataGrid.alignNumbersRight"
label={_t('settings.dataGrid.alignNumbersRight', { defaultMessage: 'Align numbers to right' })}
defaultValue={false}
/>

<FormTextField
name="dataGrid.collectionPageSize"
label={_t('settings.dataGrid.collectionPageSize', {
    defaultMessage: 'Collection page size (for MongoDB JSON view, must be between 5 and 1000)',
})}
defaultValue="50"
/>

<FormSelectField
label={_t('settings.dataGrid.coloringMode', { defaultMessage: 'Row coloring mode' })}
name="dataGrid.coloringMode"
isNative
defaultValue="36"
options={[
    {
    value: '36',
    label: _t('settings.dataGrid.coloringMode.36', { defaultMessage: 'Every 3rd and 6th row' }),
    },
    {
    value: '2-primary',
    label: _t('settings.dataGrid.coloringMode.2-primary', {
        defaultMessage: 'Every 2-nd row, primary color',
    }),
    },
    {
    value: '2-secondary',
    label: _t('settings.dataGrid.coloringMode.2-secondary', {
        defaultMessage: 'Every 2-nd row, secondary color',
    }),
    },
    { value: 'none', label: _t('settings.dataGrid.coloringMode.none', { defaultMessage: 'None' }) },
]}
/>

<FormCheckboxField
name="dataGrid.showAllColumnsWhenSearch"
label={_t('settings.dataGrid.showAllColumnsWhenSearch', {
    defaultMessage: 'Show all columns when searching',
})}
defaultValue={false}
/>
</div>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .wrapper :global(select){
    max-width: 400px;
  }

  .wrapper :global(input){
    max-width: 400px;
  }
</style>