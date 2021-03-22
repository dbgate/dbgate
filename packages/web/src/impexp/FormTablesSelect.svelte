<script lang="ts">
  import _ from 'lodash';

  import FormStyledButton from '../elements/FormStyledButton.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseInfo, useDatabaseList } from '../utility/metadataLoaders';

  export let conidName;
  export let databaseName;
  export let schemaName;
  export let name;

  const { values, setFieldValue } = getFormContext();
  $: dbinfo = useDatabaseInfo({ conid: $values[conidName], database: $values[databaseName] });

  $: tablesOptions = [...(($dbinfo && $dbinfo.tables) || []), ...(($dbinfo && $dbinfo.views) || [])]
    .filter(x => !$values[schemaName] || x.schemaName == $values[schemaName])
    .map(x => ({
      value: x.pureName,
      label: x.pureName,
    }));
</script>

<div class="wrapper">
  <FormSelectField {...$$restProps} {name} options={tablesOptions} isMulti templateProps={{ noMargin: true }} />

  <div>
    <FormStyledButton
      type="button"
      value="All tables"
      on:click={() =>
        setFieldValue(name, _.uniq([...($values[name] || []), ...($dbinfo && $dbinfo.tables.map(x => x.pureName))]))}
    />
    <FormStyledButton
      type="button"
      value="All views"
      on:click={() =>
        setFieldValue(name, _.uniq([...($values[name] || []), ...($dbinfo && $dbinfo.views.map(x => x.pureName))]))}
    />
    <FormStyledButton type="button" value="Remove all" on:click={() => setFieldValue(name, [])} />
  </div>
</div>

<style>
  .wrapper {
    margin: var(--dim-large-form-margin);
  }
</style>
