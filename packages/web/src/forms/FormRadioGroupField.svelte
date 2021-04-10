<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import uuidv1 from 'uuid/v1';

  export let options = [];
  export let name;

  const { values, setFieldValue } = getFormContext();

  let group = $values[name] ?? options.find(x => x.default)?.value;

  $: setFieldValue(name, group);

  $: optionsWithId = options.map(x => ({ ...x, id: uuidv1() }));
</script>

{#each optionsWithId as option}
  <div>
    <input type="radio" bind:group value={option.value} id={option.id} />
    <label for={option.id}>{option.label}</label>
  </div>
{/each}
