<script lang="ts">
  import resolveApi from '../../utility/resolveApi';

  export let runnerId;
  export let row;
</script>

<a href={`${resolveApi()}/runners/data/${runnerId}/${row.name}`} target="_blank" rel="noopener noreferrer">
  download
</a>
