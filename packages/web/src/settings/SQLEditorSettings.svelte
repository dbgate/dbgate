<script lang="ts">
  import CheckboxField from "../forms/CheckboxField.svelte";
  import FormCheckboxField from "../forms/FormCheckboxField.svelte";
  import FormFieldTemplateLarge from "../forms/FormFieldTemplateLarge.svelte";
  import FormSelectField from "../forms/FormSelectField.svelte";
  import FormTextField from "../forms/FormTextField.svelte";
  import SelectField from "../forms/SelectField.svelte";
  import { EDITOR_KEYBINDINGS_MODES } from "../query/AceEditor.svelte";
  import { currentEditorKeybindigMode } from "../stores";
  import { _t } from "../translations";


</script>

<div class="wrapper">
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
    data-testid="SQLEditorSettings_sqlCommandsCase"
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
    <FormCheckboxField
    name="sqlEditor.wordWrap"
    label={_t('settings.editor.wordWrap', { defaultMessage: 'Enable word wrap' })}
    defaultValue={false}
    />
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
</div>

<style>
    .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .wrapper :global(input){
    max-width: 400px;
  }
</style>