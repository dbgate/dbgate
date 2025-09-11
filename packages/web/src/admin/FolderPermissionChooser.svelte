<script lang='ts'>
  import PermissionCheckBox from './PermissionCheckBox.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';

  const { values } = getFormContext();

  export let onSetPermission;
  export let label;
  export let folder;
</script>

<PermissionCheckBox
  {label}
  permission={`files/${folder}/*`}
  permissions={$values.permissions}
  basePermissions={$values.basePermissions}
  {onSetPermission}
/>

<div class="ml-4">
  <PermissionCheckBox
    label="Read"
    permission={`files/${folder}/read`}
    permissions={$values.permissions}
    basePermissions={$values.basePermissions}
    {onSetPermission}
  />
  <PermissionCheckBox
    label="Write"
    permission={`files/${folder}/write`}
    permissions={$values.permissions}
    basePermissions={$values.basePermissions}
    {onSetPermission}
  />
</div>
