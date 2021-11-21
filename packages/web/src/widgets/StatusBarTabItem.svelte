<script lang="ts">
  import { getContext, onDestroy, onMount } from 'svelte';

  import uuidv1 from 'uuid/v1';
  import { updateStatuBarInfoItem } from './StatusBar.svelte';

  export let text;

  const key = uuidv1();
  const tabid = getContext('tabid');

  onMount(() => {
    updateStatuBarInfoItem(tabid, key, { text });
  });
  onDestroy(() => updateStatuBarInfoItem(tabid, key, null));
</script>
