<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';

  export let name;
  export let value;
  export let text;

  const { values, setFieldValue } = getFormContext();
</script>

<div>
  <input
    type="radio"
    {name}
    checked={$values[name] == value}
    on:click={() => setFieldValue(name, value)}
  />
  <span on:click={() => setFieldValue(name, value)}>{text}</span>
</div>
