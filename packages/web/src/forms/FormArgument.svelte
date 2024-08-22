<script lang="ts">
  import _ from 'lodash';

  import FormCheckboxField from './FormCheckboxField.svelte';
  import FormSelectField from './FormSelectField.svelte';
  import FormTextField from './FormTextField.svelte';
  import FormStringList from './FormStringList.svelte';

  export let arg;
  export let namePrefix;

  $: name = `${namePrefix}${arg.name}`;
</script>

{#if arg.type == 'text'}
  <FormTextField
    label={arg.label}
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
  />
{:else if arg.type == 'stringlist'}
  <FormStringList
    label={arg.label}
    addButtonLabel={arg.addButtonLabel}
    {name}
    placeholder={arg.placeholder}
  />
{:else if arg.type == 'number'}
  <FormTextField
    label={arg.label}
    type="number"
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
  />
{:else if arg.type == 'checkbox'}
  <FormCheckboxField label={arg.label} {name} defaultValue={arg.default} />
{:else if arg.type == 'select'}
  <FormSelectField
    label={arg.label}
    isNative
    {name}
    defaultValue={arg.default}
    options={arg.options.map(opt =>
      _.isString(opt) ? { label: opt, value: opt } : { label: opt.name, value: opt.value }
    )}
  />
{/if}
