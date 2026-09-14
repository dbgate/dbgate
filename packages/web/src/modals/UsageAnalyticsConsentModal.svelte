<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let modalId;
  export let onConsent;

  function choose(consent: boolean) {
    onConsent(consent);
    closeCurrentModal();
  }
</script>

<ModalBase {modalId} disableClose simple>
  <svelte:fragment slot="header">
    {_t('usageAnalytics.consent.title', { defaultMessage: 'Anonymous usage analytics' })}
  </svelte:fragment>

  <div class="content">
    <p>
      {_t('usageAnalytics.consent.message', {
        defaultMessage:
          'Would you like to help improve DbGate by sending anonymous information about which features are used?',
      })}
    </p>
    <p class="details">
      {_t('usageAnalytics.consent.details', {
        defaultMessage:
          'DbGate does not send SQL, database or table names, connection details, or other user-created content. The collector derives the country from the request and does not store the IP address. You can change this choice later in Settings.',
      })}
    </p>
  </div>

  <svelte:fragment slot="footer">
    <FormStyledButton
      type="button"
      value={_t('usageAnalytics.consent.allow', { defaultMessage: 'Allow anonymous analytics' })}
      skipWidth
      on:click={() => choose(true)}
      data-testid="UsageAnalyticsConsentModal_allowButton"
    />
    <FormStyledButton
      type="button"
      value={_t('usageAnalytics.consent.decline', { defaultMessage: 'No, thanks' })}
      skipWidth
      on:click={() => choose(false)}
      data-testid="UsageAnalyticsConsentModal_declineButton"
    />
  </svelte:fragment>
</ModalBase>

<style>
  .content {
    line-height: 1.5;
  }

  p {
    margin: 0 0 12px;
  }

  .details {
    color: var(--theme-generic-font-grayed);
    font-size: 0.9em;
    margin-bottom: 0;
  }
</style>
