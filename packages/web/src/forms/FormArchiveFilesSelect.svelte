<script lang="ts">
  import _ from 'lodash';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
  import { getFormContext } from './FormProviderCore.svelte';

  import FormSelectField from './FormSelectField.svelte';

  export let folderName;
  export let name;
  export let filterExtension = null;

  const { setFieldValue, values } = getFormContext();

  $: files = useArchiveFiles({ folder: folderName });
  $: filesOptions = ($files || [])
    .filter(x => (filterExtension ? x.name.endsWith('.' + filterExtension) : true))
    .map(x => ({
      value: x.name,
      label: x.name,
    }));
</script>

<div class="wrapper">
  <FormSelectField {...$$props} options={filesOptions} isMulti templateProps={{ noMargin: true }} />
  <div>
    <FormStyledButton
      type="button"
      value="All files"
      on:click={() => setFieldValue(name, _.uniq([...($values[name] || []), ...($files && $files.map(x => x.name))]))}
    />
    <FormStyledButton type="button" value="Remove all" on:click={() => setFieldValue(name, [])} />
  </div>
</div>

<style>
  .wrapper {
    margin: var(--dim-large-form-margin);
  }
</style>
