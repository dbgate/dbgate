<script lang="ts">
  import _ from 'lodash';
  import DbKeyValueDetail from './DbKeyValueDetail.svelte';

  export let dbKeyFields;
  export let item;
  export let onChangeItem = null;
</script>

<div class="props">
  {#each dbKeyFields as column}
    <DbKeyValueDetail {item} {column} {onChangeItem} />
  {/each}
</div>

<style>
  .props {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
