<script lang="ts">
  import FormCheckboxField from "../forms/FormCheckboxField.svelte";
  import FormSelectField from "../forms/FormSelectField.svelte";
  import FormTextField from "../forms/FormTextField.svelte";
  import { _t } from "../translations";
  import { isProApp } from "../utility/proTools";


</script>

<div class="wrapper">
<div class="heading">{_t('settings.other', { defaultMessage: 'Other' })}</div>

<FormTextField
name="other.gistCreateToken"
label={_t('settings.other.gistCreateToken', { defaultMessage: 'API token for creating error gists' })}
defaultValue=""
/>

<FormSelectField
label={_t('settings.other.autoUpdateApplication', { defaultMessage: 'Auto update application' })}
name="app.autoUpdateMode"
isNative
defaultValue=""
options={[
    {
    value: 'skip',
    label: _t('settings.other.autoUpdateApplication.skip', {
        defaultMessage: 'Do not check for new versions',
    }),
    },
    {
    value: '',
    label: _t('settings.other.autoUpdateApplication.check', { defaultMessage: 'Check for new versions' }),
    },
    {
    value: 'download',
    label: _t('settings.other.autoUpdateApplication.download', {
        defaultMessage: 'Check and download new versions',
    }),
    },
]}
/>

{#if isProApp()}
<FormCheckboxField
    name="ai.allowSendModels"
    label={_t('settings.other.ai.allowSendModels', {
    defaultMessage: 'Allow to send DB models and query snippets to AI service',
    })}
    defaultValue={false}
/>
{/if}
</div>


<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }
</style>