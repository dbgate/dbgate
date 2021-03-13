<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import TextField from '../forms/TextField.svelte';
  import { extensions } from '../stores';
  import { getTargetName } from './createImpExpScript';

  const { values, setFieldValue } = getFormContext();

  export let name;
</script>

<TextField
  value={getTargetName($extensions, name, $values)}
  onChange={e => setFieldValue(`targetName_${name}`, e.target.value)}
/>
