<script lang="ts">
  import FormDropDownTextField from '../forms/FormDropDownTextField.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import { _t } from '../translations';

  const { values, setFieldValue } = getFormContext();

  $: dataTypes = dialect?.predefinedDataTypes || ['int', 'varchar(250)', 'datetime', 'numeric(10,2)', 'float'];

  function createDataTypesMenu() {
    return dataTypes.map(type => ({
      text: type,
      onClick: () => setFieldValue('dataType', type),
    }));
  }

  export let dialect;
  export let disabled = false;
</script>

<FormDropDownTextField name="dataType" label="{_t('tableEditor.dataType', { defaultMessage: 'Data type' })}" menu={createDataTypesMenu} {disabled} />
