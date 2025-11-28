<script lang="ts">
  import CheckboxField from "../forms/CheckboxField.svelte";
  import FormCheckboxField from "../forms/FormCheckboxField.svelte";
  import FormFieldTemplateLarge from "../forms/FormFieldTemplateLarge.svelte";
  import FormSelectField from "../forms/FormSelectField.svelte";
  import FormTextField from "../forms/FormTextField.svelte";
  import FormValues from "../forms/FormValues.svelte";
  import { lockedDatabaseMode } from "../stores";
  import { _t } from "../translations";

    
</script>

<div class="wrapper">
<FormValues let:values>
    <div class="heading">{_t('settings.connection', { defaultMessage: 'Connection' })}</div>

    <FormFieldTemplateLarge
    label={_t('settings.connection.showOnlyTabsFromSelectedDatabase', {
        defaultMessage: 'Show only tabs from selected database',
    })}
    type="checkbox"
    labelProps={{
        onClick: () => {
        $lockedDatabaseMode = !$lockedDatabaseMode;
        },
    }}
    >
    <CheckboxField checked={$lockedDatabaseMode} on:change={e => ($lockedDatabaseMode = e.target.checked)} />
    </FormFieldTemplateLarge>

    <FormCheckboxField
    name="connection.autoRefresh"
    label={_t('settings.connection.autoRefresh', {
        defaultMessage: 'Automatic refresh of database model on background',
    })}
    defaultValue={false}
    />
    <FormTextField
    name="connection.autoRefreshInterval"
    label={_t('settings.connection.autoRefreshInterval', {
        defaultMessage: 'Interval between automatic DB structure reloads in seconds',
    })}
    defaultValue="30"
    disabled={values['connection.autoRefresh'] === false}
    />
    <FormSelectField
    label={_t('settings.connection.sshBindHost', { defaultMessage: 'Local host address for SSH connections' })}
    name="connection.sshBindHost"
    isNative
    defaultValue="127.0.0.1"
    options={[
        { value: '127.0.0.1', label: '127.0.0.1 (IPv4)' },
        { value: '::1', label: '::1  (IPv6)' },
        { value: 'localhost', label: 'localhost (domain name)' },
    ]}
    />

    <div class="heading">{_t('settings.session', { defaultMessage: 'Query sessions' })}</div>
    <FormCheckboxField
    name="session.autoClose"
    label={_t('settings.session.autoClose', {
        defaultMessage: 'Automatic close query sessions after period without any activity',
    })}
    defaultValue={true}
    />
    <FormTextField
    name="session.autoCloseTimeout"
    label={_t('settings.session.autoCloseTimeout', {
        defaultMessage: 'Interval, after which query session without activity is closed (in minutes)',
    })}
    defaultValue="15"
    disabled={values['session.autoClose'] === false}
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