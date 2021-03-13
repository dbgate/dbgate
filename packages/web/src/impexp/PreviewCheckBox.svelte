<script lang="ts">
  import CheckboxField from '../forms/CheckboxField.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import { findFileFormat } from '../plugins/fileformats';
  import { extensions } from '../stores';

  const { values } = getFormContext();

  export let name;
  export let previewSource;

  $: supportsPreview =
    !!findFileFormat($extensions, $values.sourceStorageType) || $values.sourceStorageType == 'archive';
</script>

{#if supportsPreview}
  <CheckboxField
    checked={$previewSource == name}
    onChange={e => {
      if (e.target.checked) $previewSource = name;
      else $previewSource = null;
    }}
  />
{/if}
