<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { extensions } from '../stores';
  import { getActionOptions } from './createImpExpScript';

  export let name;
  export let targetDbinfo;

  const { values, setFieldValue } = getFormContext();

  $: options = getActionOptions($extensions, name, $values, targetDbinfo);
</script>

<SelectField
  {options}
  isNative
  value={$values[`actionType_${name}`] || options[0].value}
  on:change={e => setFieldValue(`actionType_${name}`, e.detail)}
/>
