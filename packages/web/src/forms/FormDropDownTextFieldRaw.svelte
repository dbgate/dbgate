<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import InlineButton from '../elements/InlineButton.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';
  import DropDownButton from '../elements/DropDownButton.svelte';

  export let name;
  export let disabled = false;
  export let defaultValue;
  export let menu;

  const { values, setFieldValue } = getFormContext();

  let showPassword = false;

  $: value = $values[name];
  $: isCrypted = value && value.startsWith('crypt:');

</script>

<div class="flex">
  <TextField
    {...$$restProps}
    value={$values[name] ?? defaultValue}
    on:input={e => setFieldValue(name, e.target['value'])}
  />
  <DropDownButton {menu} {disabled} />
</div>
