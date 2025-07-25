<script lang="ts">
  import SimpleFilesInput, { ProcessedFile } from '../impexp/SimpleFilesInput.svelte';
  import { parseFileAsString } from '../utility/parseFileAsString';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  export let label: string;
  export let buttonLabel: string = 'Choose File';
  export let name: string;
  export let disabled: boolean = false;
  export let accept: string = '.json,application/json';
  export let templateProps = {};

  const { template, setFieldValue, values } = getFormContext();
  const dispatch = createEventDispatcher();

  let fileName: string | null = null;
  $: hasValue = $values?.[name] != null;
  $: displayLabel = getDisplayLabel(buttonLabel, hasValue, fileName);

  async function handleFileChange(fileData: ProcessedFile): Promise<void> {
    const parseResult = await parseFileAsString(fileData.file);

    if (parseResult.success) {
      fileName = fileData.name;
      setFieldValue(name, parseResult.data);
      dispatch('change', {
        success: true,
        data: parseResult.data,
        fileName: fileData.name,
      });
    } else {
      fileName = null;
      setFieldValue(name, null);
      dispatch('change', {
        success: false,
        error: parseResult.error,
        fileName: fileData.name,
      });
    }
  }

  function getDisplayLabel(baseLabel: string, hasValue: boolean, fileName: string | null): string {
    if (!hasValue) {
      return baseLabel;
    }

    if (fileName) {
      return `${baseLabel} (${fileName})`;
    }

    return `${baseLabel} (JSON loaded)`;
  }
</script>

<svelte:component this={template} type="file" {label} {disabled} {...templateProps}>
  <SimpleFilesInput label={displayLabel} {accept} {disabled} onChange={handleFileChange} {...$$restProps} />
</svelte:component>
