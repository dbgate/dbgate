<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import uuidv1 from 'uuid/v1';

  export let options = [];
  export let name;
  export let matchValueToOption = null;

  const { values, setFieldValue } = getFormContext();

  $: optionsWithId = options.map(x => ({ ...x, id: uuidv1() }));

  function handleChange(event) {
    setFieldValue(name, event.currentTarget.value);
  }
</script>

{#each optionsWithId as option}
  <div>
    <input
      type="radio"
      checked={matchValueToOption ? matchValueToOption($values[name], option) : $values[name] == option.value}
      on:change={handleChange}
      value={option.value}
      id={option.id}
    />
    <label for={option.id}>{option.label}</label>
  </div>
{/each}
