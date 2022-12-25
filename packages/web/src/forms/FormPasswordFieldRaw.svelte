<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;
  export let disabled = false;
  export let saveOnInput = false;

  const { values, setFieldValue } = getFormContext();

  let showPassword = false;

  $: value = $values[name];
  $: isCrypted = value && value.startsWith('crypt:');
</script>

<div class="flex">
  <TextField
    {...$$restProps}
    {disabled}
    value={isCrypted ? '' : value}
    on:change={e => setFieldValue(name, e.target['value'])}
    on:input={e => {
      if (saveOnInput) {
        setFieldValue(name, e.target['value']);
      }
    }}
    placeholder={isCrypted ? '(Password is encrypted)' : undefined}
    type={isCrypted || showPassword ? 'text' : 'password'}
  />
  {#if !isCrypted}
    <InlineButton on:click={() => (showPassword = !showPassword)} {disabled}>
      <FontIcon icon="icon eye" />
    </InlineButton>
  {/if}
</div>
