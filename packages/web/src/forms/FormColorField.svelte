<script lang="ts">
  import _ from 'lodash';

  import FormSelectField from './FormSelectField.svelte';
  import ColorSelector from './ColorSelector.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { USER_COLOR_NAMES } from '../utility/userColors';

  export let emptyLabel;
  export let useSelector = false;
  export let templateProps = {};

  export let label;
  export let name;
  export let disabled = false;

  const { template } = getFormContext();
  const { values, setFieldValue } = getFormContext();
</script>

{#if useSelector}
  <svelte:component this={template} type="text" {label} {...templateProps}>
    <ColorSelector
      value={$values && $values[name]}
      {disabled}
      on:change={e => {
        setFieldValue(name, e.detail);
      }}
    />
  </svelte:component>
{:else}
  <FormSelectField
    isNative
    {disabled}
    {...$$restProps}
    {label}
    {name}
    options={[
      { value: '', label: emptyLabel },
      ...USER_COLOR_NAMES.map(color => ({ value: color, label: _.startCase(color) })),
    ]}
  />
{/if}
