<script lang="ts">
  import FormCheckboxField from "../forms/FormCheckboxField.svelte";
  import FormSelectField from "../forms/FormSelectField.svelte";
  import FormValues from "../forms/FormValues.svelte";
  import { _t } from "../translations";
  import FormDefaultActionField from "./FormDefaultActionField.svelte";


</script>

<div class="wrapper">
<FormValues let:values>
    <div class="heading">{_t('settings.defaultActions', { defaultMessage: 'Default Actions' })}</div>

    <FormSelectField
    label={_t('settings.defaultActions.connectionClick', { defaultMessage: 'Connection click' })}
    name="defaultAction.connectionClick"
    isNative
    defaultValue="connect"
    options={[
        {
        value: 'openDetails',
        label: _t('settings.defaultActions.connectionClick.openDetails', {
            defaultMessage: 'Edit / open details',
        }),
        },
        {
        value: 'connect',
        label: _t('settings.defaultActions.connectionClick.connect', { defaultMessage: 'Connect' }),
        },
        {
        value: 'none',
        label: _t('settings.defaultActions.connectionClick.none', { defaultMessage: 'Do nothing' }),
        },
    ]}
    />

    <FormSelectField
    label={_t('settings.defaultActions.databaseClick', { defaultMessage: 'Database click' })}
    name="defaultAction.databaseClick"
    isNative
    defaultValue="switch"
    options={[
        {
        value: 'switch',
        label: _t('settings.defaultActions.databaseClick.switch', { defaultMessage: 'Switch database' }),
        },
        {
        value: 'none',
        label: _t('settings.defaultActions.databaseClick.none', { defaultMessage: 'Do nothing' }),
        },
    ]}
    />

    <FormCheckboxField
    name="defaultAction.useLastUsedAction"
    label={_t('settings.defaultActions.useLastUsedAction', { defaultMessage: 'Use last used action' })}
    defaultValue={true}
    />

    <FormDefaultActionField
    label={_t('settings.defaultActions.tableClick', { defaultMessage: 'Table click' })}
    objectTypeField="tables"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
    />
    <FormDefaultActionField
    label={_t('settings.defaultActions.viewClick', { defaultMessage: 'View click' })}
    objectTypeField="views"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
    />
    <FormDefaultActionField
    label={_t('settings.defaultActions.materializedViewClick', { defaultMessage: 'Materialized view click' })}
    objectTypeField="matviews"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
    />
    <FormDefaultActionField
    label={_t('settings.defaultActions.procedureClick', { defaultMessage: 'Procedure click' })}
    objectTypeField="procedures"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
    />
    <FormDefaultActionField
    label={_t('settings.defaultActions.functionClick', { defaultMessage: 'Function click' })}
    objectTypeField="functions"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
    />
    <FormDefaultActionField
    label={_t('settings.defaultActions.collectionClick', { defaultMessage: 'NoSQL collection click' })}
    objectTypeField="collections"
    disabled={values['defaultAction.useLastUsedAction'] !== false}
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

</style>