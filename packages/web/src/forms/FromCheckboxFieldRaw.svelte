<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import CheckboxField from './CheckboxField.svelte';

  export let name;

  const { values, setFieldValue } = getFormContext();
  function handleChange(e) {
    setFieldValue(name, e.target['checked']);
  }
</script>

<CheckboxField {...$$restProps} checked={$values[name]} on:change={handleChange} />
