<script lang="ts">
  import FormDropDownTextField from '../forms/FormDropDownTextField.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';

  const { values, setFieldValue } = getFormContext();

  $: dataTypes = ['int', 'nvarchar(250)', 'datetime', 'numeric(10,2)', 'float'];

  function createDataTypesMenu() {
    return dataTypes.map(type => ({
      text: type,
      onClick: () => setFieldValue('dataType', type),
    }));
  }

</script>

<FormDropDownTextField name="dataType" label="Data type" menu={createDataTypesMenu} />
