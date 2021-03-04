<script lang="ts" context="module">
  import { getContext, setContext } from 'svelte';

  const contextKey = 'formProviderContextKey';

  export function getFormContext(): any {
    return getContext(contextKey);
  }
</script>

<script lang="ts">
  import keycodes from '../utility/keycodes';

  export let values;
  export let template;

  const setFieldValue = (name, value) => {
    values.update(x => ({ ...x, [name]: value }));
  };

  const context = {
    values,
    template,
    setFieldValue,
    submitActionRef: { current: null },
  };

  setContext(contextKey, context);

  function handleEnter(e) {
    if (e.keyCode == keycodes.enter && context.submitActionRef.current) {
      e.preventDefault();
      context.submitActionRef.current(values);
    }
  }
</script>

<slot />

<svelte:window on:keydown={handleEnter} />
