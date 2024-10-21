<script lang="ts">
  import { onMount } from 'svelte';
  import { useConfig } from './utility/metadataLoaders';
  import Link from './elements/Link.svelte';
  import { internalRedirectTo } from './clientAuth';
  import { writable } from 'svelte/store';
  import FormProviderCore from './forms/FormProviderCore.svelte';
  import FormTextAreaField from './forms/FormTextAreaField.svelte';
  import FormSubmit from './forms/FormSubmit.svelte';
  import { apiCall } from './utility/api';
  import FormStyledButton from './buttons/FormStyledButton.svelte';
  import getElectron from './utility/getElectron';
  import { openWebLink } from './utility/exportFileTools';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';

  const config = useConfig();
  const values = writable({ amoid: null, databaseServer: null });

  $: isExpired = $config?.isLicenseExpired;
  $: trialDaysLeft = $config?.trialDaysLeft;

  let errorMessage = '';
  let expiredMessageSet = false;

  $: if (isExpired && !expiredMessageSet) {
    errorMessage = 'Your license is expired';
    expiredMessageSet = true;
  }

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });
</script>

<FormProviderCore {values}>
  <SpecialPageLayout>
    <div class="heading">License</div>
    <FormTextAreaField label="Enter your license key" name="licenseKey" rows={5} />

    <div class="submit">
      <FormSubmit
        value="Save license"
        on:click={async e => {
          sessionStorage.setItem('continueTrialConfirmed', '1');
          const { licenseKey } = e.detail;
          const resp = await apiCall('config/save-license-key', { licenseKey });
          if (resp?.status == 'ok') {
            internalRedirectTo('/index.html');
          } else {
            errorMessage = resp?.errorMessage || 'Error saving license key';
          }
        }}
      />
    </div>

    {#if !isExpired && trialDaysLeft == null}
      <div class="submit">
        <FormStyledButton
          value="Start 30-day trial"
          on:click={async e => {
            errorMessage = '';
            const license = await apiCall('config/start-trial');
            if (license?.status == 'ok') {
              sessionStorage.setItem('continueTrialConfirmed', '1');
              internalRedirectTo('/index.html');
            } else {
              errorMessage = license?.errorMessage || 'Error starting trial';
            }
          }}
        />
      </div>
    {/if}

    {#if trialDaysLeft > 0}
      <div class="submit">
        <FormStyledButton
          value={`Continue trial (${trialDaysLeft} days left)`}
          on:click={async e => {
            sessionStorage.setItem('continueTrialConfirmed', '1');
            internalRedirectTo('/index.html');
          }}
        />
      </div>
    {/if}

    <div class="submit">
      <FormStyledButton
        value="Purchase DbGate Premium"
        on:click={async e => {
          openWebLink(
            `https://auth.dbgate.eu/create-checkout-session-simple?source=trial-${isExpired ? 'expired' : (trialDaysLeft ?? 'no')}`
          );
        }}
      />
    </div>

    {#if getElectron()}
      <div class="submit">
        <FormStyledButton
          value="Exit"
          on:click={e => {
            getElectron().send('quit-app');
          }}
        />
      </div>
    {/if}

    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}

    <div class="purchase-info">
      For more info about DbGate licensing, you could visit <Link href="https://dbgate.eu/">dbgate.eu</Link> web or contact
      us at <Link href="mailto:sales@dbgate.eu">sales@dbgate.eu</Link>
    </div>
  </SpecialPageLayout>
</FormProviderCore>

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

  .submit :global(input) {
    flex: 1;
    font-size: larger;
  }

  .error {
    margin: var(--dim-large-form-margin);
    color: red;
  }

  .purchase-info {
    margin: var(--dim-large-form-margin);
  }
</style>
