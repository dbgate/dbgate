<script lang="ts">
  import PerspectiveView from '../perspectives/PerspectiveView.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
</script>

<PerspectiveView {conid} {database} {schemaName} {pureName} />
