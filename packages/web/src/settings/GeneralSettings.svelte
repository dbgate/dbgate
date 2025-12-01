<script lang="ts">
  import { internalRedirectTo } from '../clientAuth';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import { EDITOR_KEYBINDINGS_MODES } from '../query/AceEditor.svelte';
  import { currentEditorKeybindigMode, currentEditorWrapEnabled } from '../stores';
  import { _t, getSelectedLanguage, setSelectedLanguage } from '../translations';
  import { isMac } from '../utility/common';
  import getElectron from '../utility/getElectron';
  import { isProApp } from '../utility/proTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';

    const electron = getElectron();
    let restartWarning = false;
</script>
<div class="wrapper">
    <div class="heading">{_t('settings.general', { defaultMessage: 'General' })}</div>
{#if electron}
    <div class="heading">{_t('settings.appearance', { defaultMessage: 'Appearance' })}</div>
    <FormCheckboxField
        name="app.useNativeMenu"
        label={isMac()
        ? _t('settings.useNativeWindowTitle', { defaultMessage: 'Use native window title' })
        : _t('settings.useSystemNativeMenu', { defaultMessage: 'Use system native menu' })}
        on:change={() => {
        restartWarning = true;
        }}
    />
    {#if restartWarning}
        <div class="ml-5 mb-3">
        <FontIcon icon="img warn" />
        {_t('settings.nativeMenuRestartWarning', {
            defaultMessage: 'Native menu settings will be applied after app restart',
        })}
        </div>
    {/if}
{/if}

<FormCheckboxField
name="tabGroup.showServerName"
label={_t('settings.tabGroup.showServerName', {
    defaultMessage: 'Show server name alongside database name in title of the tab group',
})}
defaultValue={false}
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

<div class="heading">{_t('settings.localization', { defaultMessage: 'Localization' })}</div>

<FormFieldTemplateLarge
label={_t('settings.localization.language', { defaultMessage: 'Language' })}
type="combo"
>
<SelectField
    isNative
    data-testid="SettingsModal_languageSelect"
    options={[
    { value: 'cs', label: 'Čeština' },
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português (Brasil)' },
    { value: 'sk', label: 'Slovenčina' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
    ]}
    defaultValue={getSelectedLanguage()}
    value={getSelectedLanguage()}
    on:change={e => {
    setSelectedLanguage(e.detail);
    showModal(ConfirmModal, {
        message: _t('settings.localization.reloadWarning', {
        defaultMessage: 'Application will be reloaded to apply new language settings',
        }),
        onConfirm: () => {
        setTimeout(() => {
            internalRedirectTo(electron ? '/index.html' : '/');
        }, 100);
        },
    });
    }}
/>
</FormFieldTemplateLarge>
</div>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

</style>