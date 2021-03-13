<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import SelectField from './SelectField.svelte';

  export let name;
  export let isClearable = false;

  const { values, setFieldValue } = getFormContext();
</script>

<SelectField
  {...$$restProps}
  value={$values[name]}
  on:change={e => setFieldValue(name, e.detail)}
  {isClearable}
  
/>
