<script lang="ts">
  import _ from 'lodash';

  import FormCheckboxField from './FormCheckboxField.svelte';
  import FormSelectField from './FormSelectField.svelte';
  import FormTextField from './FormTextField.svelte';
  import FormStringList from './FormStringList.svelte';
  import FormDropDownTextField from './FormDropDownTextField.svelte';
  import { getFormContext } from './FormProviderCore.svelte';

  export let arg;
  export let namePrefix;

  $: name = `${namePrefix}${arg.name}`;

  const { setFieldValue, values } = getFormContext();
</script>

{#if arg.type == 'text'}
  <FormTextField
    label={arg.label}
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
    disabled={arg.disabledFn ? arg.disabledFn($values) : arg.disabled}
  />
{:else if arg.type == 'stringlist'}
  <FormStringList label={arg.label} addButtonLabel={arg.addButtonLabel} {name} placeholder={arg.placeholder} />
{:else if arg.type == 'number'}
  <FormTextField
    label={arg.label}
    type="number"
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
    disabled={arg.disabledFn ? arg.disabledFn($values) : arg.disabled}
  />
{:else if arg.type == 'checkbox'}
  <FormCheckboxField
    label={arg.label}
    {name}
    defaultValue={arg.default}
    disabled={arg.disabledFn ? arg.disabledFn($values) : arg.disabled}
  />
{:else if arg.type == 'select'}
  <FormSelectField
    label={arg.label}
    isNative
    {name}
    defaultValue={arg.default}
    options={arg.options.map(opt =>
      _.isString(opt) ? { label: opt, value: opt } : { label: opt.name, value: opt.value }
    )}
    disabled={arg.disabledFn ? arg.disabledFn($values) : arg.disabled}
  />
{:else if arg.type == 'dropdowntext'}
  <FormDropDownTextField
    label={arg.label}
    {name}
    defaultValue={arg.default}
    menu={() => {
      return arg.options.map(opt => ({
        text: _.isString(opt) ? opt : opt.name,
        onClick: () => setFieldValue(name, _.isString(opt) ? opt : opt.value),
      }));
    }}
    disabled={arg.disabledFn ? arg.disabledFn($values) : arg.disabled}
  />
{/if}
