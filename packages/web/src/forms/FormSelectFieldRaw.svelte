<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import SelectField from './SelectField.svelte';
  import { createEventDispatcher } from 'svelte';
  import _ from 'lodash';

  const dispatch = createEventDispatcher();

  export let name;
  export let options;
  export let isClearable = false;
  export let selectFieldComponent = SelectField;
  export let defaultSelectValue;

  const { values, setFieldValue } = getFormContext();
</script>

<svelte:component
  this={selectFieldComponent}
  {...$$restProps}
  value={($values && $values[name]) || defaultSelectValue}
  options={_.compact(options)}
  on:change={e => {
    setFieldValue(name, e.detail);
    dispatch('change', e.detail);
  }}
  {isClearable}
/>
