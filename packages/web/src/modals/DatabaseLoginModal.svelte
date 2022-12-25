<script lang="ts" context="module">
  let currentModalConid = null;

  export function isDatabaseLoginVisible() {
    return !!currentModalConid;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { apiCall, setVolatileConnectionRemapping } from '../utility/api';

  import { getConnectionInfo } from '../utility/metadataLoaders';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let conid;
  export let passwordMode;

  const values = writable({});
  let connection;

  currentModalConid = conid;

  onMount(async () => {
    connection = await getConnectionInfo({ conid });
    if (passwordMode == 'askPassword') {
      $values = {
        ...$values,
        user: connection.user,
        server: connection.server,
      };
    }
  });

  onDestroy(() => {
    currentModalConid = null;
  });

  async function handleSubmit(ev) {
    const con = await apiCall('connections/save-volatile', {
      conid,
      user: ev.detail.user,
      password: ev.detail.password,
    });
    setVolatileConnectionRemapping(conid, con._id);
    closeCurrentModal();
  }
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps} simple>
    <svelte:fragment slot="header">Database Log In</svelte:fragment>

    <FormTextField label="Server" name="server" disabled />
    <FormTextField
      label="Username"
      name="user"
      autocomplete="username"
      disabled={passwordMode == 'askPassword'}
      focused={passwordMode == 'askUser'}
    />
    <FormPasswordField
      label="Password"
      name="password"
      autocomplete="current-password"
      focused={passwordMode == 'askPassword'}
    />

    <svelte:fragment slot="footer">
      <FormSubmit value="Connect" on:click={handleSubmit} />
      <FormStyledButton value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>
