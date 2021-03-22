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

  import keycodes from '../utility/keycodes';

  export let values;
  export let template = FormFieldTemplateLarge;

  const setFieldValue = (name, value) => {
    values.update(x => ({ ...x, [name]: value }));
  };

  const context = {
    values,
    template,
    setFieldValue,
    submitActionRef: createRef(null),
  };

  setContext(contextKey, context);

  function handleEnter(e) {
    if (e.keyCode == keycodes.enter && context.submitActionRef.get()) {
      e.preventDefault();
      context.submitActionRef.get()(values);
    }
  }
</script>

<slot />

<svelte:window on:keydown={handleEnter} />
