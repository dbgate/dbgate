<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';
  import DropDownButton from '../buttons/DropDownButton.svelte';

  export let name;
  export let disabled = false;
  export let defaultValue;
  export let menu;
  export let asyncMenu;

  const { values, setFieldValue } = getFormContext();

  let showPassword = false;

  $: value = $values[name];
  $: isCrypted = value && value.startsWith('crypt:');

</script>

<div class="flex">
  <TextField
    {...$$restProps}
    {disabled}
    value={$values[name] ?? defaultValue}
    on:input={e => setFieldValue(name, e.target['value'])}
  />
  <DropDownButton {menu} {asyncMenu} {disabled} />
</div>
