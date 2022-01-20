<script lang="ts">
  import { getContext, onDestroy, onMount } from 'svelte';

  import uuidv1 from 'uuid/v1';
  import { updateStatuBarInfoItem } from '../utility/statusBarStore';

  export let text;
  export let clickable = false;
  export let icon = null;
  export let onClick = null;

  const key = uuidv1();
  const tabid = getContext('tabid');

  onMount(() => {
    updateStatuBarInfoItem(tabid, key, { text, icon, clickable, onClick });
  });
  onDestroy(() => updateStatuBarInfoItem(tabid, key, null));

  $: updateStatuBarInfoItem(tabid, key, { text, icon, clickable, onClick });
</script>
