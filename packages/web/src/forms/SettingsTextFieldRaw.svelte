<script lang="ts">
  import { apiCall } from '../utility/api';

  import { useSettings } from '../utility/metadataLoaders';

  import TextField from './TextField.svelte';

  export let name;
  export let defaultValue;

  const settings = useSettings();

  function handleChange(e) {
    apiCall('config/update-settings', { [name]: e.target['value'] });
  }
</script>

<TextField {...$$restProps} value={($settings || {})[name] ?? defaultValue} on:input={handleChange} />
