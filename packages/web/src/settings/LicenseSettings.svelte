<script lang="ts">
    import { safeFormatDate } from "dbgate-tools";
    import FormStyledButton from "../buttons/FormStyledButton.svelte";
    import FormTextAreaField from "../forms/FormTextAreaField.svelte";
    import FontIcon from "../icons/FontIcon.svelte";
    import { _t } from "../translations";
    import { apiCall } from "../utility/api";
  import { useSettings } from "../utility/metadataLoaders";
  import { derived } from "svelte/store";

    const settings = useSettings();
    const settingsValues = derived(settings, $settings => {
        if (!$settings) {
        return {};
        }
        return $settings;
    });
    let licenseKeyCheckResult = null;

    $: licenseKey = $settingsValues['other.licenseKey'];
    
</script>

<div class="heading">{_t('settings.other.license', { defaultMessage: 'License' })}</div>
<FormTextAreaField
name="other.licenseKey"
label={_t('settings.other.licenseKey', { defaultMessage: 'License key' })}
rows={7}
onChange={async value => {
    licenseKeyCheckResult = await apiCall('config/check-license', { licenseKey: value });
}}
/>
{#if licenseKeyCheckResult}
<div class="m-3 ml-5">
    {#if licenseKeyCheckResult.status == 'ok'}
    <div>
        <FontIcon icon="img ok" />
        {_t('settings.other.licenseKey.valid', { defaultMessage: 'License key is valid' })}
    </div>
    {#if licenseKeyCheckResult.validTo}
        <div>
        {_t('settings.other.licenseKey.validTo', { defaultMessage: 'License valid to:' })}
        {licenseKeyCheckResult.validTo}
        </div>
    {/if}
    {#if licenseKeyCheckResult.expiration}
        <div>
        {_t('settings.other.licenseKey.expiration', { defaultMessage: 'License key expiration:' })}
        <b>{safeFormatDate(licenseKeyCheckResult.expiration)}</b>
        </div>
    {/if}
    {:else if licenseKeyCheckResult.status == 'error'}
    <div>
        <FontIcon icon="img error" />
        {licenseKeyCheckResult.errorMessage ??
        _t('settings.other.licenseKey.invalid', { defaultMessage: 'License key is invalid' })}
        {#if licenseKeyCheckResult.expiration}
        <div>
            {_t('settings.other.licenseKey.expiration', { defaultMessage: 'License key expiration:' })}
            <b>{safeFormatDate(licenseKeyCheckResult.expiration)}</b>
        </div>
        {/if}
    </div>
    {#if licenseKeyCheckResult.isExpired}
        <div class="mt-2">
        <FormStyledButton
            value={_t('settings.other.licenseKey.checkForNew', {
            defaultMessage: 'Check for new license key',
            })}
            skipWidth
            on:click={async () => {
            licenseKeyCheckResult = await apiCall('config/get-new-license', { oldLicenseKey: licenseKey });
            if (licenseKeyCheckResult.licenseKey) {
                apiCall('config/update-settings', { 'other.licenseKey': licenseKeyCheckResult.licenseKey });
            }
            }}
        />
        </div>
    {/if}
    {/if}
</div>
{/if}

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .tip {
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }
</style>