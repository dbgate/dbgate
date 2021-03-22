<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import SelectField from './SelectField.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let name;
  export let isClearable = false;

  const { values, setFieldValue } = getFormContext();
</script>

<SelectField
  {...$$restProps}
  value={$values[name]}
  on:change={e => {
    setFieldValue(name, e.detail);
    dispatch('change', e.detail);
  }}
  {isClearable}
/>
