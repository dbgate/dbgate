<script lang="ts">
  import { DIAGRAM_ZOOMS } from 'dbgate-tools';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { isProApp } from '../utility/proTools';

  export let values;
</script>

<FormProviderCore {values}>
  <FormSelectField
    defaultValue=""
    name="filterColumns"
    label="Show columns"
    data-testid="DiagramSettings_filterColumns"
    isNative
    options={[
      {
        value: '',
        label: 'All',
      },
      {
        value: 'primaryKey',
        label: 'Primary Key',
      },
      {
        value: 'allKeys',
        label: 'All Keys',
      },
      {
        value: 'notNull',
        label: 'Not Null',
      },
      {
        value: 'keysAndNotNull',
        label: 'Keys And Not Null',
      },
    ]}
  />

  <FormSelectField
    defaultValue="1"
    name="zoomKoef"
    data-testid="DiagramSettings_zoomKoef"
    label="Zoom"
    isNative
    options={DIAGRAM_ZOOMS.map(koef => ({
      value: koef.toString(),
      label: `${Math.round(koef * 100)} %`,
    }))}
  />

  <FormCheckboxField name="showNullability" label="Show NULL/NOT NULL" data-testid="DiagramSettings_showNullability" />
  <FormCheckboxField name="showDataType" label="Show data type" data-testid="DiagramSettings_showDataType" />

  <FormTextField name="columnFilter" label="Column filter" />

  {#if isProApp()}
    <FormTextField name="topTables" label="Only N most important tables" type="number" />
  {/if}
</FormProviderCore>
