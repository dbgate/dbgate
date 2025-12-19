<script lang="ts">
  import FormTextField from "../forms/FormTextField.svelte";
  import { _t } from "../translations";
</script>

<div class="wrapper">
<div class="heading">{_t('settings.externalTools', { defaultMessage: 'External Tools' })}</div>
<FormTextField
    name="externalTools.mysqldump"
    label={_t('settings.other.externalTools.mysqldump', {
    defaultMessage: 'mysqldump (backup MySQL database)',
    })}
    defaultValue="mysqldump"
/>
<FormTextField
    name="externalTools.mysql"
    label={_t('settings.other.externalTools.mysql', { defaultMessage: 'mysql (restore MySQL database)' })}
    defaultValue="mysql"
/>
<FormTextField
    name="externalTools.mysqlPlugins"
    label={_t('settings.other.externalTools.mysqlPlugins', {
    defaultMessage:
        'Folder with mysql plugins (for example for authentication). Set only in case of problems',
    })}
    defaultValue=""
/>
<FormTextField
    name="externalTools.pg_dump"
    label={_t('settings.other.externalTools.pg_dump', {
    defaultMessage: 'pg_dump (backup PostgreSQL database)',
    })}
    defaultValue="pg_dump"
/>
<FormTextField
    name="externalTools.psql"
    label={_t('settings.other.externalTools.psql', { defaultMessage: 'psql (restore PostgreSQL database)' })}
    defaultValue="psql"
/>
</div>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

</style>