<script alng="ts">
  import { defaultDatabaseObjectAppObjectActions } from '../appobj/appObjectTools';
  import FormSelectField from '../forms/FormSelectField.svelte';

  export let label;
  export let objectTypeField;
</script>

<FormSelectField
  {label}
  name={`defaultAction.dbObjectClick.${objectTypeField}`}
  isNative
  defaultValue={defaultDatabaseObjectAppObjectActions[objectTypeField][0]?.defaultActionId}
  options={defaultDatabaseObjectAppObjectActions[objectTypeField].map(x => ({
    value: x.defaultActionId,
    label: x.label,
  }))}
/>
