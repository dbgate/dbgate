<script lang="ts">
  import AppObjectCore from './AppObjectCore.svelte';

  export let commonProps;
  export let data;

</script>

<AppObjectCore {...commonProps} title={data.displayName || data.server} icon="img server" />
