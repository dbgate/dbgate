<script lang="ts">
    import FormCheckboxField from "../forms/FormCheckboxField.svelte";
    import { _t } from "../translations";
    import FontIcon from '../icons/FontIcon.svelte';
    import FormValues from "../forms/FormValues.svelte";
</script>

<div class="wrapper">
<FormValues let:values>
    <div class="heading">{_t('settings.behaviour', { defaultMessage: 'Behaviour' })}</div>

    <FormCheckboxField
    name="behaviour.useTabPreviewMode"
    label={_t('settings.behaviour.useTabPreviewMode', { defaultMessage: 'Use tab preview mode' })}
    defaultValue={true}
    />

    <FormCheckboxField
    name="behaviour.jsonPreviewWrap"
    label={_t('settings.behaviour.jsonPreviewWrap', { defaultMessage: 'Wrap JSON in preview' })}
    defaultValue={false}
    />

    <div class="tip">
    <FontIcon icon="img tip" />
    {_t('settings.behaviour.singleClickPreview', {
        defaultMessage:
        'When you single-click or select a file in the "Tables, Views, Functions" view, it is shown in a preview mode and reuses an existing tab (preview tab). This is useful if you are quickly browsing tables and don\'t want every visited table to have its own tab. When you start editing the table or use double-click to open the table from the "Tables" view, a new tab is dedicated to that table.',
    })}
    </div>

    <FormCheckboxField
    name="behaviour.openDetailOnArrows"
    label={_t('settings.behaviour.openDetailOnArrows', {
        defaultMessage: 'Open detail on keyboard navigation',
    })}
    defaultValue={true}
    disabled={values['behaviour.useTabPreviewMode'] === false}
    />

    <div class="heading">{_t('settings.confirmations', { defaultMessage: 'Confirmations' })}</div>

    <FormCheckboxField
    name="skipConfirm.tableDataSave"
    label={_t('settings.confirmations.skipConfirm.tableDataSave', {
        defaultMessage: 'Skip confirmation when saving table data (SQL)',
    })}
    />
    <FormCheckboxField
    name="skipConfirm.collectionDataSave"
    label={_t('settings.confirmations.skipConfirm.collectionDataSave', {
        defaultMessage: 'Skip confirmation when saving collection data (NoSQL)',
    })}
    />
</FormValues>
</div>

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