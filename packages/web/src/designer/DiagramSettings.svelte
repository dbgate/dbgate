<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';

  export let values;
</script>

<FormProviderCore {values}>
  <FormSelectField
    defaultValue=""
    name="filterColumns"
    label="Show columns"
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

      //   {
      //           text: 'All',
      //           onClick: changeStyleFunc('filterColumns', ''),
      //         },
      //         {
      //           text: 'Primary Key',
      //           onClick: changeStyleFunc('filterColumns', 'primaryKey'),
      //         },
      //         {
      //           text: 'All Keys',
      //           onClick: changeStyleFunc('filterColumns', 'allKeys'),
      //         },
      //         {
      //           text: 'Not Null',
      //           onClick: changeStyleFunc('filterColumns', 'notNull'),
      //         },
      //         {
      //           text: 'Keys And Not Null',
      //           onClick: changeStyleFunc('filterColumns', 'keysAndNotNull'),
      //         },
    ]}
  />

  <FormSelectField
    defaultValue="1"
    name="zoomKoef"
    label="Zoom"
    isNative
    options={[
      {
        value: '0.1',
        label: '10 %',
      },
      {
        value: '0.15',
        label: '15 %',
      },
      {
        value: '0.2',
        label: '20 %',
      },
      {
        value: '0.4',
        label: '40 %',
      },
      {
        value: '0.6',
        label: '60 %',
      },
      {
        value: '0.8',
        label: '80 %',
      },
      {
        value: '1',
        label: '100 %',
      },
      {
        value: '1.2',
        label: '120 %',
      },
      {
        value: '1.4',
        label: '140 %',
      },
      {
        value: '1.6',
        label: '160 %',
      },
      {
        value: '1.8',
        label: '180 %',
      },
      {
        value: '2',
        label: '200 %',
      },
    ]}
  />

  <FormCheckboxField name="showNullability" label="Show NULL/NOT NULL" />
  <FormCheckboxField name="showDataType" label="Show data type" />
</FormProviderCore>
