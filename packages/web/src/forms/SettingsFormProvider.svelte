<script lang="ts" context="module">
  import { getContext, setContext } from 'svelte';

  const contextKey = 'formProviderContextKey';

  export function getFormContext(): any {
    return getContext(contextKey);
  }
</script>

<script lang="ts">
  import FormFieldTemplateLarge from './FormFieldTemplateLarge.svelte';
  import createRef from '../utility/createRef';
  import { apiCall } from '../utility/api';
  import { useSettings } from '../utility/metadataLoaders';
  import { derived } from 'svelte/store';

  export let template = FormFieldTemplateLarge;

  const settings = useSettings();
  const values = derived(settings, $settings => {
    if (!$settings) {
      return {};
    }
    return $settings;
  });

  const setFieldValue = (name, value) => {
    apiCall('config/update-settings', { [name]: value });
  };

  const context = {
    values,
    template,
    setFieldValue,
    submitActionRef: createRef(null),
  };

  setContext(contextKey, context);
</script>

<slot />
