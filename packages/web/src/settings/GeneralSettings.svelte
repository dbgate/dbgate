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

<div class="heading">{_t('settings.dataGrid.title', { defaultMessage: 'Data grid' })}</div>
<FormTextField
name="dataGrid.pageSize"
label={_t('settings.dataGrid.pageSize', {
    defaultMessage: 'Page size (number of rows for incremental loading, must be between 5 and 50000)',
})}
defaultValue="100"
/>
{#if isProApp()}
<FormCheckboxField
    name="dataGrid.showHintColumns"
    label={_t('settings.dataGrid.showHintColumns', { defaultMessage: 'Show foreign key hints' })}
    defaultValue={true}
/>
{/if}
<!-- <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} /> -->

<FormCheckboxField
name="dataGrid.thousandsSeparator"
label={_t('settings.dataGrid.thousandsSeparator', {
    defaultMessage: 'Use thousands separator for numbers',
})}
/>

<FormTextField
name="dataGrid.defaultAutoRefreshInterval"
label={_t('settings.dataGrid.defaultAutoRefreshInterval', {
    defaultMessage: 'Default grid auto refresh interval in seconds',
})}
defaultValue="10"
/>

<FormCheckboxField
name="dataGrid.alignNumbersRight"
label={_t('settings.dataGrid.alignNumbersRight', { defaultMessage: 'Align numbers to right' })}
defaultValue={false}
/>

<FormTextField
name="dataGrid.collectionPageSize"
label={_t('settings.dataGrid.collectionPageSize', {
    defaultMessage: 'Collection page size (for MongoDB JSON view, must be between 5 and 1000)',
})}
defaultValue="50"
/>

<FormSelectField
label={_t('settings.dataGrid.coloringMode', { defaultMessage: 'Row coloring mode' })}
name="dataGrid.coloringMode"
isNative
defaultValue="36"
options={[
    {
    value: '36',
    label: _t('settings.dataGrid.coloringMode.36', { defaultMessage: 'Every 3rd and 6th row' }),
    },
    {
    value: '2-primary',
    label: _t('settings.dataGrid.coloringMode.2-primary', {
        defaultMessage: 'Every 2-nd row, primary color',
    }),
    },
    {
    value: '2-secondary',
    label: _t('settings.dataGrid.coloringMode.2-secondary', {
        defaultMessage: 'Every 2-nd row, secondary color',
    }),
    },
    { value: 'none', label: _t('settings.dataGrid.coloringMode.none', { defaultMessage: 'None' }) },
]}
/>

<FormCheckboxField
name="dataGrid.showAllColumnsWhenSearch"
label={_t('settings.dataGrid.showAllColumnsWhenSearch', {
    defaultMessage: 'Show all columns when searching',
})}
defaultValue={false}
/>

<div class="heading">{_t('settings.sqlEditor', { defaultMessage: 'SQL editor' })}</div>

<div class="flex">
<div class="col-3">
    <FormSelectField
    label={_t('settings.sqlEditor.sqlCommandsCase', { defaultMessage: 'SQL commands case' })}
    name="sqlEditor.sqlCommandsCase"
    isNative
    defaultValue="upperCase"
    options={[
        { value: 'upperCase', label: 'UPPER CASE' },
        { value: 'lowerCase', label: 'lower case' },
    ]}
    />
</div>
<div class="col-3">
    <FormFieldTemplateLarge
    label={_t('settings.editor.keybinds', { defaultMessage: 'Editor keybinds' })}
    type="combo"
    >
    <SelectField
        isNative
        defaultValue="default"
        options={EDITOR_KEYBINDINGS_MODES.map(mode => ({ label: mode.label, value: mode.value }))}
        value={$currentEditorKeybindigMode}
        on:change={e => ($currentEditorKeybindigMode = e.detail)}
    />
    </FormFieldTemplateLarge>
</div>
<div class="col-3">
    <FormFieldTemplateLarge
    label={_t('settings.editor.wordWrap', { defaultMessage: 'Enable word wrap' })}
    type="combo"
    >
    <CheckboxField
        checked={$currentEditorWrapEnabled}
        on:change={e => ($currentEditorWrapEnabled = e.target.checked)}
    />
    </FormFieldTemplateLarge>
</div>
</div>

<FormTextField
name="sqlEditor.limitRows"
label={_t('settings.sqlEditor.limitRows', { defaultMessage: 'Return only N rows from query' })}
placeholder={_t('settings.sqlEditor.limitRowsPlaceholder', { defaultMessage: '(No rows limit)' })}
/>

<FormCheckboxField
name="sqlEditor.showTableAliasesInCodeCompletion"
label={_t('settings.sqlEditor.showTableAliasesInCodeCompletion', {
    defaultMessage: 'Show table aliases in code completion',
})}
defaultValue={false}
/>

<FormCheckboxField
name="sqlEditor.disableSplitByEmptyLine"
label={_t('settings.sqlEditor.disableSplitByEmptyLine', { defaultMessage: 'Disable split by empty line' })}
defaultValue={false}
/>

<FormCheckboxField
name="sqlEditor.disableExecuteCurrentLine"
label={_t('settings.sqlEditor.disableExecuteCurrentLine', {
    defaultMessage: 'Disable current line execution (Execute current)',
})}
defaultValue={false}
/>

<FormCheckboxField
name="sqlEditor.hideColumnsPanel"
label={_t('settings.sqlEditor.hideColumnsPanel', { defaultMessage: 'Hide Columns/Filters panel by default' })}
defaultValue={false}
/>

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