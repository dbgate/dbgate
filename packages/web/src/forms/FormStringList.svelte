<script lang="ts">
  import _ from 'lodash';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  export let name;
  export let label;
  export let addButtonLabel;
  export let placeholder;
  export let templateProps;

  const { template, values, setFieldValue } = getFormContext();

  $: stringList = $values[name] ?? [];
</script>

<svelte:component this={template} type="text" {label} {...templateProps}>
  {#each stringList as value, index}
    <div class='input-line-flex'>
      <TextField
        {value}
        {placeholder}
        on:input={e => {
          const newValues = stringList.map((v, i) => (i === index ? e.target['value'] : v));
          setFieldValue(name, newValues);
        }}
      />

      <InlineButton
        on:click={() => {
          setFieldValue(name, [...stringList.slice(0, index), ...stringList.slice(index + 1)]);
        }}
      >
        <FontIcon icon="icon delete" />
      </InlineButton>
    </div>
  {/each}

  <FormStyledButton
    value={addButtonLabel}
    on:click={() => {
      setFieldValue(name, [...stringList, '']);
    }}
  />
</svelte:component>

<style>
    .input-line-flex {
        display: flex;
    }
</style>