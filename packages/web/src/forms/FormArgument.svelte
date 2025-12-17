<script lang="ts">
  import _ from 'lodash';

  import FormCheckboxField from './FormCheckboxField.svelte';
  import FormSelectField from './FormSelectField.svelte';
  import FormTextField from './FormTextField.svelte';
  import FormStringList from './FormStringList.svelte';
  import FormDropDownTextField from './FormDropDownTextField.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { _tval } from '../translations';

  export let arg;
  export let namePrefix;
  export let isReadOnly = false;

  $: name = `${namePrefix}${arg.name}`;

  const { setFieldValue, values } = getFormContext();
</script>

{#if arg.type == 'text'}
  <FormTextField
    label={_tval(arg.label)}
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
    disabled={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{:else if arg.type == 'stringlist'}
  <FormStringList
    label={_tval(arg.label)}
    addButtonLabel={_tval(arg.addButtonLabel)}
    {name}
    placeholder={arg.placeholder}
    isReadOnly={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{:else if arg.type == 'number'}
  <FormTextField
    label={_tval(arg.label)}
    type="number"
    {name}
    defaultValue={arg.default}
    focused={arg.focused}
    placeholder={arg.placeholder}
    disabled={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{:else if arg.type == 'checkbox'}
  <FormCheckboxField
    label={_tval(arg.label)}
    {name}
    defaultValue={arg.default}
    disabled={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{:else if arg.type == 'select'}
  <FormSelectField
    label={_tval(arg.label)}
    isNative
    {name}
    defaultValue={arg.default}
    options={arg.options.map(opt =>
      _.isString(opt) ? { label: opt, value: opt } : { label: opt.name, value: opt.value }
    )}
    disabled={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{:else if arg.type == 'dropdowntext'}
  <FormDropDownTextField
    label={_tval(arg.label)}
    {name}
    defaultValue={arg.default}
    menu={() => {
      return arg.options.map(opt => ({
        text: _.isString(opt) ? opt : opt.name,
        onClick: () => setFieldValue(name, _.isString(opt) ? opt : opt.value),
      }));
    }}
    disabled={isReadOnly || (arg.disabledFn ? arg.disabledFn($values) : arg.disabled)}
  />
{/if}
