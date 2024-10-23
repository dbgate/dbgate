<script lang="ts">
  import { writable } from 'svelte/store';
  import FormCheckboxField from './forms/FormCheckboxField.svelte';
  import FormPasswordField from './forms/FormPasswordField.svelte';
  import FormSubmit from './forms/FormSubmit.svelte';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';
  import FormProviderCore from './forms/FormProviderCore.svelte';
  import { apiCall } from './utility/api';
  import { useConfig } from './utility/metadataLoaders';
  import ErrorInfo from './elements/ErrorInfo.svelte';
  import { internalRedirectTo } from './clientAuth';

  const values = writable({ denyUseAdminPassword: false });
  const config = useConfig();

  let error;
</script>

<SpecialPageLayout>
  <FormProviderCore {values}>
    <div class="heading">Set admin password</div>

    <div class="text">
      Please set password for DbGate administrator account. If you lose this paassword, you can change it later in
      DbGate internal database, in table config.
    </div>

    <FormCheckboxField label="Don't use admin password" name="denyUseAdminPassword" />

    {#if $values?.denyUseAdminPassword}
      <div class="text">
        You have selected to not use admin password. You can change this setting later in DbGate internal database, in
        table config. Please assign to some regular user admin role, to be able to perform admin tasks.
      </div>
    {:else}
      {#if $config?.adminPasswordState == 'set'}
        <FormPasswordField label="Current password" name="oldPassword" autocomplete="current-password" saveOnInput />
      {/if}
      <FormPasswordField label="New password" name="newPassword" autocomplete="current-password" saveOnInput />
      <FormPasswordField label="Repeat password" name="repeatPassword" autocomplete="current-password" saveOnInput />
    {/if}

    {#if error}
      <ErrorInfo message={error} />
    {/if}

    <div class="submit">
      <FormSubmit
        value={$values?.denyUseAdminPassword ? 'Save' : 'Set password'}
        on:click={async e => {
          const resp = await apiCall('storage/set-admin-password', e.detail);
          if (resp?.status == 'error') {
            error = resp?.errorMessage;
            return;
          }
          internalRedirectTo('/admin.html');
        }}
      />
    </div>
  </FormProviderCore>
</SpecialPageLayout>

<style>
  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }

  .submit {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .text {
    margin-left: var(--dim-large-form-margin);
    margin-right: var(--dim-large-form-margin);
  }
</style>
