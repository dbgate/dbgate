<script lang="ts">
  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;
</script>

<DbKeysSubTree {conid} {database} root="" />
