<script lang="ts">
  import _ from 'lodash';

  import FormSelectField from './FormSelectField.svelte';
  import ColorSelector from './ColorSelector.svelte';
  import { presetPrimaryColors } from '@ant-design/colors';
  import { getFormContext } from './FormProviderCore.svelte';

  export let emptyLabel;
  export let useSelector = false;
  export let templateProps = {};

  export let label;
  export let name;

  const { template } = getFormContext();
  const { values, setFieldValue } = getFormContext();
</script>

{#if useSelector}
  <svelte:component this={template} type="text" {label} {...templateProps}>
    <ColorSelector
      value={$values && $values[name]}
      on:change={e => {
        setFieldValue(name, e.detail);
      }}
    />
  </svelte:component>
{:else}
  <FormSelectField
    isNative
    {...$$restProps}
    {label}
    {name}
    options={[
      { value: '', label: emptyLabel },
      ..._.keys(presetPrimaryColors).map(color => ({ value: color, label: _.startCase(color) })),
    ]}
  />
{/if}
