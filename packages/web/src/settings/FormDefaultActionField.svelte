<script lang="ts">
  import { defaultDatabaseObjectAppObjectActions } from '../appobj/appObjectTools';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { lastUsedDefaultActions } from '../stores';
  import { _tval } from '../translations';

  export let label;
  export let objectTypeField;
  export let disabled = false;
</script>

<FormFieldTemplateLarge {label} type="combo">
  <SelectField
    {label}
    isNative
    {disabled}
    defaultValue={defaultDatabaseObjectAppObjectActions[objectTypeField][0]?.defaultActionId}
    options={defaultDatabaseObjectAppObjectActions[objectTypeField].map(x => ({
      value: x.defaultActionId,
      label: _tval(x.label),
    }))}
    value={$lastUsedDefaultActions[objectTypeField]}
    on:change={e => {
      lastUsedDefaultActions.update(actions => ({
        ...actions,
        [objectTypeField]: e.detail,
      }));
    }}
  />
</FormFieldTemplateLarge>
