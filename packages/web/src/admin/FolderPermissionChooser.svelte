<script lang='ts'>
  import PermissionCheckBox from './PermissionCheckBox.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';

  const { values } = getFormContext();

  export let onSetPermission;
  export let label;
  export let folder;
  export let disabled = false;
</script>

<PermissionCheckBox
  {label}
  permission={`files/${folder}/*`}
  permissions={$values.permissions}
  basePermissions={$values.basePermissions}
  {onSetPermission}
  {disabled}
/>

<div class="ml-4">
  <PermissionCheckBox
    label="Read"
    permission={`files/${folder}/read`}
    permissions={$values.permissions}
    basePermissions={$values.basePermissions}
    {onSetPermission}
    {disabled}
  />
  <PermissionCheckBox
    label="Write"
    permission={`files/${folder}/write`}
    permissions={$values.permissions}
    basePermissions={$values.basePermissions}
    {onSetPermission}
    {disabled}
  />
</div>
