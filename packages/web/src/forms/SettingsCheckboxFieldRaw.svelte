<script lang="ts">
  import CheckboxField from './CheckboxField.svelte';
  import { apiCall } from '../utility/api';
  import _ from 'lodash';
  import { useSettings } from '../utility/metadataLoaders';

  export let name;
  export let defaultValue;

  const settings = useSettings();

  function handleChange(e) {
    apiCall('config/update-settings', { [name]: e.target['checked'] });
  }
</script>

<CheckboxField {...$$restProps} checked={($settings || {})[name] ?? defaultValue} on:change={handleChange} on:change />
